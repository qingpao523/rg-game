extends Node

## BattleScene - 战斗场景主控制器

class_name BattleScene

var _skill_runner: SkillRunner
var _wave_director: WaveDirector
var _treasure_goblin: TreasureGoblinDirector
var _hud: HudView
var _pause_view: PauseView
var _choice_view: SkillChoiceView
var _player: Player

func _ready() -> void:
	# 获取引用
	_player = $Player
	_skill_runner = $SkillRunner
	_wave_director = $WaveDirector
	_treasure_goblin = $TreasureGoblinDirector

	# 创建 UI（也可以通过预制体）
	_hud = preload("res://assets/prefabs/hud.tscn").instantiate()
	add_child(_hud)
	_choice_view = preload("res://assets/ui/skill_choice.tscn").instantiate()
	add_child(_choice_view)
	_pause_view = preload("res://assets/ui/pause.tscn").instantiate()
	add_child(_pause_view)

	# 连接事件
	EventBus.player_leveled_up.connect(_on_level_up)
	EventBus.player_died.connect(_on_player_died)
	EventBus.choice_made.connect(_on_choice_made)

	# 挂载主动技能
	var session = GameSession
	if session.active_skill_id != "":
		_skill_runner.acquire_active_ability(session.active_skill_id)

	# 开始刷怪
	_wave_director.start()

	# 暂停处理
	EventBus.game_state_changed.connect(_on_game_state_changed)

func _process(delta: float) -> void:
	if TimeService:
		TimeService.process(delta)
	# 主动技能触发（键盘/手柄）
	if Input.is_action_just_pressed("active_skill"):
		_skill_runner.try_cast_active()
	# 暂停
	if Input.is_action_just_pressed("pause"):
		if GameApp.state == GameApp.GameState.PLAYING:
			GameApp.pause_game()
		elif GameApp.state == GameApp.GameState.PAUSED:
			GameApp.resume_game()
	# 检查哥布林
	_treasure_goblin.try_spawn()

func _on_level_up(_new_level: int) -> void:
	# 从技能池中选 3 个（排除已有的）
	var owned = GameSession.skill_level_map.keys()
	var pool = []
	for sid in SkillConfig.get_all_ids():
		if sid not in owned:
			pool.append(sid)
	if pool.size() == 0:
		return
	# 如果池子不足 3 个，用已有技能填充升级选项
	if pool.size() < 3:
		pool = SkillConfig.get_all_ids()
	pool.shuffle()
	var choices = pool.slice(0, 3)
	_choice_view.show_choices(choices)

func _on_choice_made(skill_id: String) -> void:
	# 判断是新技能还是已有技能
	if GameSession.skill_level_map.has(skill_id):
		GameSession.upgrade_skill(skill_id)
	else:
		GameSession.add_skill(skill_id)

func _on_player_died() -> void:
	GameApp.end_game()

func _on_game_state_changed(new_state: int) -> void:
	match new_state:
		GameApp.GameState.PAUSED:
			_pause_view.show_pause()
		GameApp.GameState.PLAYING:
			_pause_view.hide()
