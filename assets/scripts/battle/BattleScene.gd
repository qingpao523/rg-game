extends Node

## BattleScene - 战斗场景主控制器

class_name BattleScene

var _skill_runner
var _wave_director
var _treasure_goblin
var _hud
var _pause_view
var _choice_view
var _player

func _ready() -> void:
	print("[Battle] _ready 调用开始")
	_player = $Player
	_skill_runner = $SkillRunner
	_wave_director = $WaveDirector
	_treasure_goblin = $TreasureGoblinDirector
	print("[Battle] 节点: P=", _player, " SR=", _skill_runner)

	if not _player:
		push_error("[Battle] 缺少 Player 节点")
		return
	if not _skill_runner:
		push_error("[Battle] 缺少 SkillRunner 节点")
		return

	# 设置 3×3 地图
	_setup_map()

	# 玩家出生在破碎龙庭地图中心
	_player.global_position = Vector2(2508, 1411.5)
	print("[Player] 出生位置（地图中心）: 2508, 1411.5")

	print("[Battle] 加载 UI...")
	_hud = preload("res://assets/prefabs/hud.tscn").instantiate()
	add_child(_hud)
	_choice_view = preload("res://assets/prefabs/skill_choice.tscn").instantiate()
	add_child(_choice_view)
	_pause_view = preload("res://assets/prefabs/pause.tscn").instantiate()
	add_child(_pause_view)
	print("[Battle] UI 加载完成")

	EventBus.player_leveled_up.connect(_on_level_up)
	EventBus.player_died.connect(_on_player_died)
	EventBus.game_state_changed.connect(_on_game_state_changed)
	EventBus.active_skill_requested.connect(_on_active_skill_requested)
	_choice_view.choice_made.connect(_on_choice_made)

	var starter_skill = "taoist_burn_curse"
	GameSession.add_skill(starter_skill)
	_skill_runner.acquire_skill(starter_skill)
	print("[Battle] 赠送技能: ", starter_skill)

	if GameSession.active_skill_id != "":
		_skill_runner.acquire_active_ability(GameSession.active_skill_id)
		print("[Battle] 主动技能: ", GameSession.active_skill_id)

	if _wave_director:
		_wave_director.start()
	print("[Battle] _ready 完成")

func _setup_map() -> void:
	# 地图参数：背景图 1672x941，3 倍缩放 → 5016x2823
	var TW = 1672
	var TH = 941
	var SCL = 3
	var MW = TW * SCL
	var MH = TH * SCL

	# 边界碰撞墙（玩家不可走出地图范围）
	var wall_thick = 40
	var walls = [
		[Vector2(MW / 2, -wall_thick / 2), Vector2(MW, wall_thick)],       # 上
		[Vector2(MW / 2, MH + wall_thick / 2), Vector2(MW, wall_thick)], # 下
		[Vector2(-wall_thick / 2, MH / 2), Vector2(wall_thick, MH)],        # 左
		[Vector2(MW + wall_thick / 2, MH / 2), Vector2(wall_thick, MH)], # 右
	]
	for wall_data in walls:
		var wall = StaticBody2D.new()
		var shape = CollisionShape2D.new()
		var rect = RectangleShape2D.new()
		rect.size = wall_data[1]
		shape.shape = rect
		wall.position = wall_data[0]
		wall.add_child(shape)
		add_child(wall)

	# 设置 Camera2D 视野范围
	var cam = _player.get_node_or_null("Camera2D") as Camera2D
	if cam:
		cam.limit_left = 0
		cam.limit_top = 0
		cam.limit_right = MW
		cam.limit_bottom = MH

func _process(delta: float) -> void:
	if TimeService:
		TimeService.process(delta)
	# 主动技能触发
	if Input.is_action_just_pressed("active_skill"):
		_on_active_skill_requested()
	# 暂停
	if Input.is_action_just_pressed("pause"):
		if GameApp.state == GameApp.GameState.PLAYING:
			GameApp.pause_game()
		elif GameApp.state == GameApp.GameState.PAUSED:
			GameApp.resume_game()
	# 检查哥布林
	if _treasure_goblin:
		_treasure_goblin.try_spawn()

func _on_level_up(_new_level: int) -> void:
	TimeService.pause()
	var owned = GameSession.skill_level_map  # skill_id -> current_level
	var pool = []  # 候选：["skill_id"] 或 ["skill_id:upgrade"]

	# 1. 可升级的已有技能（1→2, 2→3 ... 11→12）
	for sid in owned:
		var lv = owned[sid]
		if lv < 12:
			pool.append(sid + ":upgrade")

	# 2. 可获取的新技能（有前置依赖的检查前置）
	for sid in SkillConfig.get_all_ids():
		if sid in owned:
			continue
		if not _is_taoist_skill(sid):
			continue
		if not _has_prerequisites(sid, owned):
			continue
		pool.append(sid)

	# 3. 随机抽 3 个（优先保留升级项）
	pool.shuffle()
	# 确保至少 1 个升级项（如果有的话）
	var upgrades = pool.filter(func(s): return s.ends_with(":upgrade"))
	var new_skills = pool.filter(func(s): return not s.ends_with(":upgrade"))
	var choices = []
	choices.append_array(upgrades.slice(0, 2))
	choices.append_array(new_skills.slice(0, 3 - choices.size()))
	choices.shuffle()
	if choices.size() == 0:
		# 没得选了，给全部技能池
		for sid in SkillConfig.get_all_ids():
			choices.append(sid)
		choices.shuffle()
	choices = choices.slice(0, 3)
	_choice_view.show_choices(choices)
	print("[Battle] 升级选择: ", choices)
	get_tree().paused = true

static func _has_prerequisites(sid: String, owned: Dictionary) -> bool:
	# 前置依赖检查
	match sid:
		"taoist_skull_enhance", "taoist_raise_dead", "taoist_corpse_burst":
			return owned.has("taoist_summon_skeleton") or owned.has("taoist_summon_archer")
		"taoist_summon_archer":
			return owned.has("taoist_summon_skeleton")
		"taoist_ignite_explode":
			return owned.has("taoist_burn_curse")
	return true

static func _is_taoist_skill(sid: String) -> bool:
	# 道士可用技能标签
	var taoist_tags = ["雷", "火", "召唤", "投射", "附伤", "输出", "控制", "光环", "区域", "灾厄"]
	var cfg = SkillConfig.get_config(sid)
	var tags = cfg.get("tags", [])
	for t in tags:
		if t in taoist_tags:
			return true
	return false

func _on_choice_made(skill_id: String) -> void:
	print("[Battle] 选择了技能: ", skill_id)
	var is_upgrade = skill_id.ends_with(":upgrade")
	var actual_id = skill_id.trim_suffix(":upgrade")

	if is_upgrade or GameSession.skill_level_map.has(actual_id):
		GameSession.upgrade_skill(actual_id)
	else:
		GameSession.add_skill(actual_id)
		var cfg = SkillConfig.get_config(actual_id)
		if cfg.get("passive", false):
			_skill_runner._activate_passive(actual_id)
	_choice_view.hide()
	get_tree().paused = false
	TimeService.resume()

func _on_active_skill_requested() -> void:
	if GameApp.state == GameApp.GameState.PLAYING and _skill_runner:
		_skill_runner.try_cast_active()

func _on_player_died() -> void:
	GameApp.end_game()

func _on_game_state_changed(new_state: int) -> void:
	match new_state:
		GameApp.GameState.PAUSED:
			_pause_view.show_pause()
		GameApp.GameState.PLAYING:
			_pause_view.hide()
