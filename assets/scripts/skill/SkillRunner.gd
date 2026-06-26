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
		skill.tick(delta)
		# 自动释放基础技能
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
	var skill_data = instance.config
	var scene_path = "res://assets/scenes/battle/projectile.tscn"
	_spawn_projectile(player, instance)
	instance.reset_cooldown()

func _spawn_projectile(from: Node, instance: SkillInstance) -> void:
	var cfg = instance.config
	var count = cfg.get("count_base", 1) + cfg.get("count_per_level", 0) * (instance.level - 1)
	for i in range(count):
		var proj = preload("res://assets/prefabs/projectile.tscn").instantiate()
		proj.global_position = from.global_position
		proj.direction = _get_target_direction(from.global_position)
		proj.speed = cfg.get("projectile_speed", 400.0)
		proj.damage = instance.get_damage()
		get_tree().current_scene.add_child(proj)

func _get_target_direction(from_pos: Vector2) -> Vector2:
	# 朝向最近敌人方向
	var nearest = _get_nearest_enemy(from_pos)
	if nearest:
		return (nearest.global_position - from_pos).normalized()
	return Vector2.RIGHT   # 默认朝右

func _get_player() -> Player:
	var players = get_tree().get_nodes_in_group("player")
	return players[0] if players.size() > 0 else null

func _get_nearest_enemy(from_pos: Vector2) -> Node2D:
	var enemies = get_tree().get_nodes_in_group("enemy")
	var nearest: Node2D = null
	var min_dist = INF
	for e in enemies:
		var d = from_pos.distance_squared_to(e.global_position)
		if d < min_dist:
			min_dist = d
			nearest = e
	return nearest

func _on_skill_acquired(skill_id: String, level: int) -> void:
	acquire_skill(skill_id)

func _on_skill_upgraded(skill_id: String, new_level: int) -> void:
	for s in _skill_instances:
		if s.skill_id == skill_id:
			s.level = new_level
			break

func _on_skill_evolved(base_id: String, evolved_id: String) -> void:
	# 移除旧技能
	_skill_instances = _skill_instances.filter(func(s): return s.skill_id != base_id)
	# 添加进化技能
	var cfg = EvolutionConfig.get_config(evolved_id)
	if not cfg.is_empty():
		var instance = SkillInstance.new(evolved_id, cfg, self, SkillInstance.SkillCategory.EVOLVED)
		_skill_instances.append(instance)
