extends Node

## TreasureGoblinDirector - 宝藏哥布林管理器
## 屏幕边缘方向提示、逃跑、消失和击杀奖励

class_name TreasureGoblinDirector

var _goblin_alive: bool = false
var _next_spawn_time: float = 60.0   # 首次 60 秒后出现
var _goblin_node: Node2D = null
var _direction_indicator: Node2D = null

signal goblin_killed
signal goblin_escaped

func _ready() -> void:
	pass

func _process(delta: float) -> void:
	if _goblin_alive and _is_off_screen():
		_goblin_escape()

func try_spawn() -> bool:
	if _goblin_alive:
		return false
	if TimeService.game_time < _next_spawn_time:
		return false
	# 生成哥布林
	_goblin_alive = true
	var scene = preload("res://assets/prefabs/treasure_goblin.tscn")
	_goblin_node = scene.instantiate()
	_goblin_node.global_position = _get_edge_position()
	get_tree().current_scene.add_child(_goblin_node)
	EventBus.emit_signal("goblin_spawned", _goblin_node)
	_show_direction_indicator()
	return true

func _get_edge_position() -> Vector2:
	var viewport = get_viewport().get_visible_rect().size
	var margin = 80.0
	var side = randi() % 4
	match side:
		0: return Vector2(randf_range(margin, viewport.x - margin), -margin)
		1: return Vector2(viewport.x + margin, randf_range(margin, viewport.y - margin))
		2: return Vector2(randf_range(margin, viewport.x - margin), viewport.y + margin)
		_: return Vector2(-margin, randf_range(margin, viewport.y - margin))

func _is_off_screen() -> bool:
	if not _goblin_node:
		return true
	var viewport = get_viewport().get_visible_rect()
	return not viewport.has_point(_goblin_node.global_position)

func _goblin_escape() -> void:
	_goblin_alive = false
	if _goblin_node:
		_goblin_node.queue_free()
		_goblin_node = null
	_hide_direction_indicator()
	emit_signal("goblin_escaped")
	_next_spawn_time = TimeService.game_time + randf_range(30.0, 60.0)

func _on_goblin_killed() -> void:
	_goblin_alive = false
	_goblin_node = null
	_hide_direction_indicator()
	emit_signal("goblin_killed")
	# 下一只间隔变短
	_next_spawn_time = TimeService.game_time + randf_range(20.0, 40.0)

func _show_direction_indicator() -> void:
	pass   # TODO: 实现屏幕边缘方向箭头 UI

func _hide_direction_indicator() -> void:
	pass   # TODO: 隐藏方向箭头
