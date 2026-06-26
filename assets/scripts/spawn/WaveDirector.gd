extends Node

## WaveDirector - 波次刷怪指挥
## 按配表和压力曲线生成怪物

class_name WaveDirector

var _current_wave: int = 0
var _wave_template: Dictionary = {}
var _spawn_index: int = 0
var _spawn_timer: float = 0.0
var _wave_elapsed: float = 0.0
var _active_wave_duration: float = 0.0
var _spawning: bool = false

signal wave_completed
signal wave_started(wave: int)

func _ready() -> void:
	EventBus.goblin_spawned.connect(_maybe_spawn_goblin)

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
	# 按 spawns 配置刷怪
	if _spawn_index < _wave_template.spawns.size():
		var current_spawn = _wave_template.spawns[_spawn_index]
		if _spawn_timer >= current_spawn.interval:
			_spawn_enemy(current_spawn.type)
			current_spawn.count -= 1
			_spawn_timer = 0.0
			if current_spawn.count <= 0:
				_spawn_index += 1

func _spawn_enemy(type: String) -> void:
	var cfg = EnemyConfig.get_config(type)
	if cfg.is_empty():
		return
	var scene = preload("res://assets/prefabs/enemy.tscn")
	var instance = scene.instantiate()
	# 根据波次缩放
	var scale_mult = 1.0 + (_current_wave - 1) * 0.1
	instance.hp = cfg.hp + cfg.hp_per_wave * (_current_wave - 1)
	instance.max_hp = instance.hp
	instance.move_speed = cfg.move_speed
	instance.damage = cfg.damage + cfg.damage_per_wave * (_current_wave - 1)
	instance.exp_reward = cfg.exp_reward + cfg.exp_per_wave * (_current_wave - 1)
	# 放在屏幕外随机边缘
	instance.global_position = _get_spawn_position()
	instance.scale = Vector2.ONE * cfg.get("scale", 1.0)
	get_tree().current_scene.add_child(instance)
	EventBus.emit_signal("enemy_spawned", instance)

func _get_spawn_position() -> Vector2:
	var viewport = get_viewport()
	var size = viewport.get_visible_rect().size
	var margin = 50.0
	var side = randi() % 4
	match side:
		0: return Vector2(randf_range(-margin, size.x + margin), -margin)         # 上
		1: return Vector2(size.x + margin, randf_range(-margin, size.y + margin)) # 右
		2: return Vector2(randf_range(-margin, size.x + margin), size.y + margin) # 下
		_: return Vector2(-margin, randf_range(-margin, size.y + margin))          # 左

func _maybe_spawn_goblin(_goblin: Node) -> void:
	pass   # TreasureGoblinDirector 会处理
