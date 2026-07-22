extends Node

## WaveDirector - 波次刷怪指挥 v2
## 对象池 + 动态难度 + 集群刷怪

class_name WaveDirector

var _current_wave: int = 0
var _wave_template: Dictionary = {}
var _spawn_index: int = 0
var _spawn_timer: float = 0.0
var _wave_elapsed: float = 0.0
var _active_wave_duration: float = 0.0
var _spawning: bool = false
var _max_on_screen: int = 300
var _pool_ready: bool = false

signal wave_completed
signal wave_started(wave: int)

func _ready() -> void:
	EventBus.goblin_spawned.connect(_maybe_spawn_goblin)
	# 预创建对象池
	var scene = preload("res://assets/prefabs/enemy.tscn")
	ObjectPool.create_group("enemies", scene, 80)

func start() -> void:
	_current_wave = 1
	_start_wave()

func _start_wave() -> void:
	_wave_template = WaveConfig.get_wave_template(_current_wave)
	_wave_elapsed = 0.0
	_spawn_index = 0
	_spawn_timer = 0.0
	_spawning = true
	_active_wave_duration = _wave_template.get("duration", 30.0)
	# 高波次开局直接投放一波集群（怪物潮）
	if _current_wave >= 3:
		_spawn_swarm(_current_wave * 2)
	EventBus.emit_signal("wave_changed", _current_wave)
	GameSession.wave = _current_wave
	print("[WaveDirector] 波次 ", _current_wave, " 开始")

func _process(delta: float) -> void:
	if not _spawning or GameApp.state != GameApp.GameState.PLAYING:
		return
	_wave_elapsed += delta
	_spawn_timer += delta
	# 检查波次超时
	if _wave_elapsed >= _active_wave_duration:
		_spawning = false
		emit_signal("wave_completed")
		_current_wave += 1
		_start_wave()
		return
	# 检查同屏数量
	var alive = _count_enemies()
	if alive >= _max_on_screen:
		return
	# 按 spawns 配置刷怪
	if _spawn_index < _wave_template.spawns.size():
		var current_spawn = _wave_template.spawns[_spawn_index]
		if _spawn_timer >= current_spawn.interval:
			# 每次生成多只（集群效果）
			var batch = 1 + (_current_wave / 5)
			for i in range(min(batch, _max_on_screen - alive)):
				_spawn_enemy(current_spawn.type)
			current_spawn.count -= 1
			_spawn_timer = 0.0
			if current_spawn.count <= 0:
				_spawn_index += 1

func _count_enemies() -> int:
	var c = 0
	for e in get_tree().get_nodes_in_group("enemy"):
		if is_instance_valid(e) and e.visible and bool(e.get("alive")):
			c += 1
	return c

func _spawn_swarm(count: int) -> void:
	# 集群生成：圆形包围圈
	var center = _get_player_position()
	for i in range(count):
		var instance = ObjectPool.acquire("enemies")
		if not instance:
			return
		var angle = i * (TAU / count)
		var radius = 600.0
		instance.global_position = center + Vector2(cos(angle), sin(angle)) * radius
		_init_enemy(instance, "grunt")

func _spawn_enemy(type: String) -> void:
	var cfg = EnemyConfig.get_config(type)
	if cfg.is_empty():
		return
	# 从第 2 波起，按概率替换为冲锋怪，保持 Demo 敌人都使用新美术资产。
	var actual_type = type
	if _current_wave >= 2 and type != "elite" and randf() < 0.2:
		actual_type = "charger"
		cfg = EnemyConfig.get_config("charger")
	var instance = ObjectPool.acquire("enemies")
	if not instance:
		return
	_init_enemy(instance, actual_type, cfg)
	# 位置
	instance.global_position = _get_spawn_position()
	# 集群效果：额外生成几只同类型怪在附近
	if _current_wave >= 4 and randf() < 0.3:
		for i in range(3):
			var extra = ObjectPool.acquire("enemies")
			if not extra:
				break
			_init_enemy(extra, actual_type, cfg)
			extra.global_position = instance.global_position + Vector2(randf_range(-80, 80), randf_range(-80, 80))

func _init_enemy(instance: Node, type_str: String, cfg: Dictionary = {}) -> void:
	if cfg.is_empty():
		cfg = EnemyConfig.get_config(type_str)
	if cfg.is_empty():
		return
	if instance.has_method("set_sprite_by_type"):
		instance.set_sprite_by_type(type_str)
	if instance.has_method("reset_for_spawn"):
		instance.reset_for_spawn(_get_player_node())
	if instance is Actor:
		instance.alive = true
		instance.visible = true
		instance.set_process(true)
		instance.set_physics_process(true)
	# 前 3 波为绝对安全期，第 4 波开始难度递增
	var hp_mult: float = 1.0
	var atk_mult: float = 1.0
	var spd_mult: float = 1.0
	if _current_wave >= 4:
		var offset = _current_wave - 3
		hp_mult += offset * 0.15
		atk_mult += offset * 0.10
		spd_mult += offset * 0.02
	var wave = _current_wave
	instance.hp = (cfg.hp + cfg.hp_per_wave * (wave - 1)) * hp_mult
	instance.max_hp = int(instance.hp)
	instance.move_speed = cfg.move_speed * spd_mult
	instance.damage = (cfg.damage + cfg.damage_per_wave * (wave - 1)) * atk_mult
	instance.exp_reward = cfg.exp_reward + cfg.exp_per_wave * (wave - 1)
	instance.scale = Vector2.ONE * cfg.get("scale", 1.0)
	instance.set_meta("pool_type", "enemies")
	EventBus.emit_signal("enemy_spawned", instance)

func _get_player_position() -> Vector2:
	var player := _get_player_node()
	if player:
		return player.global_position
	return Vector2(2508, 1411.5)

func _get_player_node() -> Node2D:
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0 and players[0] is Node2D:
		return players[0] as Node2D
	return null

func _get_spawn_position() -> Vector2:
	var size = get_viewport().get_visible_rect().size
	var center = _get_player_position()
	var half = size * 0.5
	var margin = 80.0
	var side = randi() % 4
	match side:
		0: return Vector2(randf_range(center.x - half.x, center.x + half.x), center.y - half.y - margin)
		1: return Vector2(center.x + half.x + margin, randf_range(center.y - half.y, center.y + half.y))
		2: return Vector2(randf_range(center.x - half.x, center.x + half.x), center.y + half.y + margin)
		_: return Vector2(center.x - half.x - margin, randf_range(center.y - half.y, center.y + half.y))

func _maybe_spawn_goblin(_goblin: Node) -> void:
	pass
