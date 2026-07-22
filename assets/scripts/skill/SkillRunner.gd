extends Node

## SkillRunner - 技能运行器
## 挂在 Battle 场景上，驱动所有已获取技能的 Tick 和释放

class_name SkillRunner

var _skill_instances: Array[SkillInstance] = []
var _active_skill_instance: SkillInstance = null

func _ready() -> void:
	EventBus.skill_acquired.connect(_on_skill_acquired)
	EventBus.skill_upgraded.connect(_on_skill_upgraded)
	EventBus.skill_evolved.connect(_on_skill_evolved)

func _process(delta: float) -> void:
	if not _can_process():
		return
	for skill in _skill_instances:
		# 被动技能不参与自动施放
		if skill.config.get("passive", false):
			continue
		skill.tick(delta)
		if skill.category == SkillInstance.SkillCategory.BASE and skill.is_ready():
			_try_cast_skill(skill)

func _can_process() -> bool:
	return GameApp.state == GameApp.GameState.PLAYING

func acquire_skill(skill_id: String) -> bool:
	var cfg = SkillConfig.get_config(skill_id)
	if cfg.is_empty():
		push_error("[SkillRunner] 技能不存在: ", skill_id)
		return false
	var instance = SkillInstance.new(skill_id, cfg, self)
	_skill_instances.append(instance)
	return true

func acquire_active_ability(skill_id: String) -> void:
	var cfg = CharacterConfig.get_config(skill_id) if GameSession.character_id != "" else {}
	if cfg.is_empty():
		cfg = SkillConfig.get_config(skill_id)
	var instance = SkillInstance.new(skill_id, cfg, self, SkillInstance.SkillCategory.ACTIVE_ABILITY)
	_active_skill_instance = instance

func try_cast_active() -> void:
	if _active_skill_instance and _active_skill_instance.is_ready():
		_try_cast_skill(_active_skill_instance)

func _try_cast_skill(instance: SkillInstance) -> void:
	var player = _get_player()
	if not player:
		return
	if player.has_method("play_cast_visual"):
		player.play_cast_visual()
	var cfg = instance.config
	var tags = cfg.get("tags", [])

	# 雷电技能：从天而降的落雷
	if instance.skill_id in ["chain_lightning", "taoist_thunder_bolt"]:
		_cast_lightning(player, instance)
		instance.reset_cooldown()
		return

	# 雷云：丢在怪物区域，不跟随玩家
	if instance.skill_id == "taoist_thunder_cloud":
		_cast_cloud(player, instance)
		instance.reset_cooldown()
		return

	if "召唤" in tags:
		_cast_summon(player, instance)
	elif "区域" in tags:
		_cast_area(player, instance)
	elif "光环" in tags:
		_cast_aura(player, instance)
	elif "附伤" in tags:
		_cast_buff(player, instance)
	else:
		_spawn_projectile(player, instance)
	instance.reset_cooldown()

func _spawn_projectile(from: Node, instance: SkillInstance) -> void:
	var cfg = instance.config
	var count = cfg.get("count_base", 1) + cfg.get("count_per_level", 0) * (instance.level - 1)
	count = ceili(count)
	for i in range(count):
		var proj = preload("res://assets/prefabs/projectile.tscn").instantiate()
		proj.global_position = from.global_position
		proj.direction = _get_target_direction(from.global_position)
		proj.speed = cfg.get("projectile_speed", 400.0)
		proj.damage = instance.get_damage()
		var pierce_cfg = instance.config.get("pierce", 0)
		if pierce_cfg > 0:
			proj.pierce = true
		var tex = _get_projectile_texture(instance.skill_id)
		if tex != "":
			proj.set_texture(tex)
		_get_spawn_parent().add_child(proj)

func _get_projectile_texture(skill_id: String) -> String:
	match skill_id:
		"magic_missile": return "res://assets/art/projectiles/magic_missile.tres"
		"fireball": return "res://assets/art/projectiles/fireball.tres"
		"chain_lightning": return "res://assets/art/projectiles/chain_lightning.tres"
		"taoist_thunder_bolt": return "res://assets/art/projectiles/thunder_bolt.tres"
		"taoist_burn_curse": return "res://assets/art/projectiles/burn_curse.tres"
	return ""

func _cast_lightning(from: Node, inst: SkillInstance) -> void:
	# 闪电技能：直接从目标位置上方劈下，没有飞行的弹幕
	var target_pos = _get_target_position(from.global_position)
	var dmg = inst.get_damage()
	# 对范围内所有敌人造成伤害
	var enemies = get_tree().get_nodes_in_group("enemy")
	var hit_count = 0
	# 获取弹射次数（chain_lightning）
	var bounces = 1
	if inst.skill_id == "chain_lightning":
		var cfg = inst.config
		bounces = cfg.get("bounce_count", 1) + cfg.get("bounce_per_level", 0) * (inst.level - 1)
		bounces = ceili(bounces)
	# 找最近敌人下雷
	var nearest: Node2D = null
	var min_dist = INF
	for e in enemies:
		if not _is_valid_enemy_target(e):
			continue
		var d = target_pos.distance_squared_to(e.global_position)
		if d < min_dist:
			min_dist = d
			nearest = e
	if not nearest:
		return
	# 命中主目标
	_strike(nearest, dmg)
	hit_count += 1
	# 弹射到其他敌人
	if bounces > 1:
		var hit_enemies = [nearest]
		var current = nearest
		for b in range(bounces - 1):
			var next_target: Node2D = null
			var next_dist = INF
			for e in enemies:
				if not _is_valid_enemy_target(e) or e in hit_enemies:
					continue
				var d = current.global_position.distance_squared_to(e.global_position)
				if d < next_dist and d <= 400 * 400:
					next_dist = d
					next_target = e
			if next_target:
				_strike(next_target, dmg)
				hit_enemies.append(next_target)
				current = next_target
				hit_count += 1

func _strike(target: Node, damage: float) -> void:
	# 闪电打击：直接造成伤害 + 视觉特效
	if target.has_method("take_damage"):
		target.take_damage(damage)
	# 闪电击中视觉：创建一个闪白效果
	if is_instance_valid(target):
		var flash = ColorRect.new()
		flash.color = Color(1, 1, 1, 0.6)
		flash.size = Vector2(20, 20)
		flash.position = Vector2(-10, -10)
		flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
		target.add_child(flash)
		var tween = get_tree().create_timer(0.08)
		tween.timeout.connect(func():
			if is_instance_valid(flash):
				flash.queue_free()
		)

func _cast_cloud(from: Node, inst: SkillInstance) -> void:
	# 雷云：丢到目标位置，不跟随玩家
	var cfg = inst.config
	var zone = preload("res://assets/prefabs/effect_zone.tscn").instantiate()
	zone.global_position = _get_target_position(from.global_position)
	_get_spawn_parent().add_child(zone)
	# 设置雷云纹理（比默认更透明）
	var sprite = zone.get_node_or_null("Sprite")
	if sprite:
		var tex = load("res://assets/art/effects/thunder_cloud.tres")
		if tex:
			sprite.texture = tex
		sprite.modulate = Color(1, 1, 1, 0.4)  # 半透明
	zone.setup(cfg.get("name", "cloud"), cfg.get("damage_base", 0) + cfg.get("damage_per_level", 0) * (inst.level - 1),
		cfg.get("duration", 8.0), cfg.get("range", 250), 0.0, 0.0)

func _cast_summon(from: Node, inst: SkillInstance) -> void:
	var cfg = inst.config
	var scene_path = "res://assets/prefabs/skeleton.tscn"
	if cfg.has("attack_range"):
		scene_path = "res://assets/prefabs/skeleton_archer.tscn"
	var scene = load(scene_path)
	if not scene:
		return
	# 召唤数量：Lv.1=1只, Lv.2+=2只（不超过召唤上限）
	var max_summon = cfg.get("summon_limit", 3) + cfg.get("summon_limit_per_level", 0) * (inst.level - 1)
	max_summon = ceili(max_summon)
	var summon_count = 1 if inst.level == 1 else 2
	# 检查当前存活的召唤物数量
	var alive = 0
	for c in get_tree().get_nodes_in_group("minion"):
		if is_instance_valid(c):
			alive += 1
	var available = max(0, max_summon - alive)
	summon_count = min(summon_count, available)
	for i in range(summon_count):
		var minion = scene.instantiate()
		var offset = Vector2(randf_range(-40, 40), randf_range(-40, 40))
		minion.global_position = from.global_position + offset
		if minion.has_method("set_owner_id"):
			minion.set_owner_id("player")
		if minion.has_method("set_minion_stats"):
			var hp = cfg.get("summon_hp", 30) + cfg.get("summon_hp_per_level", 10) * (inst.level - 1)
			var atk = inst.get_damage() * (1.0 + cfg.get("attack_buff", 0.0))
			minion.set_minion_stats(hp, atk)
		_get_spawn_parent().add_child(minion)

func _cast_area(from: Node, inst: SkillInstance) -> void:
	var cfg = inst.config
	var zone = preload("res://assets/prefabs/effect_zone.tscn").instantiate()
	zone.global_position = _get_target_position(from.global_position)
	_get_spawn_parent().add_child(zone)
	var tex_path = _get_area_texture(inst.skill_id)
	if tex_path != "":
		var sprite = zone.get_node_or_null("Sprite")
		if sprite:
			var tex = load(tex_path)
			if tex:
				sprite.texture = tex
	zone.setup(cfg.get("name", "zone"), cfg.get("damage_base", 0) + cfg.get("damage_per_level", 0) * (inst.level - 1),
		cfg.get("duration", 4.0), cfg.get("range", 60), cfg.get("slow_percent", 0.0), cfg.get("stun_chance", 0.0))

func _get_area_texture(skill_id: String) -> String:
	match skill_id:
		"taoist_fire_wall": return "res://assets/art/effects/fire_wall.tres"
		"taoist_paralyze_zone": return "res://assets/art/effects/paralysis_field.tres"
	return ""

func _cast_aura(from: Node, inst: SkillInstance) -> void:
	var cfg = inst.config
	var aura = preload("res://assets/prefabs/effect_aura.tscn").instantiate()
	aura.global_position = from.global_position
	_get_spawn_parent().add_child(aura)
	var tex_path = _get_aura_texture(inst.skill_id)
	if tex_path != "":
		var sprite = aura.get_node_or_null("Sprite")
		if sprite:
			var tex = load(tex_path)
			if tex:
				sprite.texture = tex
	aura.setup(cfg.get("name", "aura"), cfg.get("damage_base", 0) + cfg.get("damage_per_level", 0) * (inst.level - 1),
		cfg.get("cooldown", 1.5), cfg.get("range", 250), from, inst)

func _get_aura_texture(skill_id: String) -> String:
	match skill_id:
		"taoist_thunder_cloud": return "res://assets/art/effects/thunder_cloud.tres"
	return ""

func _cast_buff(from: Node, inst: SkillInstance) -> void:
	print("[SkillRunner] 增益技能: ", inst.skill_id, " Lv.", inst.level)

func _get_target_position(from_pos: Vector2) -> Vector2:
	var nearest = _get_nearest_enemy(from_pos)
	if nearest:
		return nearest.global_position
	return from_pos + Vector2(100, 0)

func _get_target_direction(from_pos: Vector2) -> Vector2:
	var nearest = _get_nearest_enemy(from_pos)
	if nearest:
		return (nearest.global_position - from_pos).normalized()
	# 无敌人时朝玩家面朝方向
	var player = _get_player()
	if player:
		var sprite = player.get_node_or_null("Sprite")
		if sprite:
			return Vector2.LEFT if sprite.scale.x < 0 else Vector2.RIGHT
	return Vector2.RIGHT

func _get_player() -> Player:
	var players = get_tree().get_nodes_in_group("player")
	return players[0] if players.size() > 0 else null

func _get_nearest_enemy(from_pos: Vector2) -> Node2D:
	var enemies = get_tree().get_nodes_in_group("enemy")
	var nearest: Node2D = null
	var min_dist = INF
	for e in enemies:
		if not _is_valid_enemy_target(e):
			continue
		var d = from_pos.distance_squared_to(e.global_position)
		if d < min_dist:
			min_dist = d
			nearest = e
	return nearest

func _is_valid_enemy_target(node: Node) -> bool:
	if not is_instance_valid(node) or not (node is Node2D):
		return false
	if node is CanvasItem and not node.visible:
		return false
	var alive_value = node.get("alive")
	if alive_value != null and not bool(alive_value):
		return false
	return true

func _activate_passive(skill_id: String) -> void:
	match skill_id:
		"taoist_raise_dead":
			if not EventBus.enemy_killed.is_connected(_on_enemy_killed_revive):
				EventBus.enemy_killed.connect(_on_enemy_killed_revive)
			print("[SkillRunner] 激活: 亡者复苏")
		"taoist_ignite_explode":
			if not EventBus.enemy_killed.is_connected(_on_enemy_killed_explode):
				EventBus.enemy_killed.connect(_on_enemy_killed_explode)
			print("[SkillRunner] 激活: 焚身爆")
		"taoist_skull_enhance":
			print("[SkillRunner] 激活: 骷髅强化")
		"taoist_corpse_burst":
			if not EventBus.enemy_killed.is_connected(_on_enemy_killed_corpse_burst):
				EventBus.enemy_killed.connect(_on_enemy_killed_corpse_burst)
			print("[SkillRunner] 激活: 尸爆")

var _last_explode: float = 0.0
var _last_corpse: float = 0.0

func _on_enemy_killed_revive(enemy: Node, _killer: Node) -> void:
	if not is_instance_valid(enemy):
		return
	# 最多 3 只复活骷髅同时存在
	var revives = 0
	for c in get_tree().get_nodes_in_group("minion"):
		if is_instance_valid(c) and c.has_meta("is_revive"):
			revives += 1
	if revives >= 3:
		return
	# 25% 概率复活
	if randf() > 0.25:
		return
	var sk = preload("res://assets/prefabs/skeleton.tscn").instantiate()
	sk.global_position = enemy.global_position
	sk.set_meta("is_revive", true)
	sk.set_minion_stats(15, 6)
	_get_spawn_parent().add_child(sk)

func _get_spawn_parent() -> Node:
	if get_tree().current_scene:
		return get_tree().current_scene
	if get_parent():
		return get_parent()
	return get_tree().root

func _on_enemy_killed_explode(enemy: Node, _killer: Node) -> void:
	if TimeService.game_time - _last_explode < 0.5:
		return
	_last_explode = TimeService.game_time
	if not is_instance_valid(enemy):
		return
	var cfg = SkillConfig.get_config("taoist_ignite_explode")
	var lv = _get_skill_level("taoist_ignite_explode")
	var dmg = cfg.get("damage_base", 15) + cfg.get("damage_per_level", 0) * (lv - 1)
	var rng = cfg.get("explode_range", 60)
	for e in get_tree().get_nodes_in_group("enemy"):
		if is_instance_valid(e) and e != enemy:
			if e.global_position.distance_squared_to(enemy.global_position) <= rng * rng:
				if e.has_method("take_damage"):
					e.take_damage(dmg)

func _on_enemy_killed_corpse_burst(enemy: Node, _killer: Node) -> void:
	if TimeService.game_time - _last_corpse < 0.5:
		return
	_last_corpse = TimeService.game_time
	if not is_instance_valid(enemy) or not enemy.is_in_group("minion"):
		return
	var cfg = SkillConfig.get_config("taoist_corpse_burst")
	var lv = _get_skill_level("taoist_corpse_burst")
	var dmg = cfg.get("damage_base", 12) + cfg.get("damage_per_level", 0) * (lv - 1)
	var rng = cfg.get("explode_range", 70)
	for e in get_tree().get_nodes_in_group("enemy"):
		if is_instance_valid(e):
			if e.global_position.distance_squared_to(enemy.global_position) <= rng * rng:
				if e.has_method("take_damage"):
					e.take_damage(dmg)

func _get_skill_level(skill_id: String) -> int:
	for s in _skill_instances:
		if s.skill_id == skill_id:
			return s.level
	return 1

func _on_skill_acquired(skill_id: String, level: int) -> void:
	acquire_skill(skill_id)

func _on_skill_upgraded(skill_id: String, new_level: int) -> void:
	for s in _skill_instances:
		if s.skill_id == skill_id:
			s.level = new_level
			break

func _on_skill_evolved(base_id: String, evolved_id: String) -> void:
	_skill_instances = _skill_instances.filter(func(s): return s.skill_id != base_id)
	var cfg = EvolutionConfig.get_config(evolved_id)
	if not cfg.is_empty():
		var instance = SkillInstance.new(evolved_id, cfg, self, SkillInstance.SkillCategory.EVOLVED)
		_skill_instances.append(instance)
