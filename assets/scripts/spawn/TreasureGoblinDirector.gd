extends Node

## TreasureGoblinDirector - 宝藏哥布林管理器
## 屏幕边缘方向提示、逃跑、消失和击杀奖励

class_name TreasureGoblinDirector

var _goblin_alive: bool = false
var _next_spawn_time: float = 60.0   # 首次 60 秒后出现
var _goblin_node: Node2D = null
var _direction_layer: CanvasLayer = null
var _direction_indicator: TextureRect = null

signal goblin_killed
signal goblin_escaped

func _ready() -> void:
	EventBus.enemy_killed.connect(_on_enemy_killed)

func _process(delta: float) -> void:
	_update_direction_indicator()
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
	_get_spawn_parent().add_child(_goblin_node)
	EventBus.emit_signal("goblin_spawned", _goblin_node)
	_show_direction_indicator()
	return true

func _get_edge_position() -> Vector2:
	var viewport = get_viewport().get_visible_rect().size
	var center = _get_player_position()
	var half = viewport * 0.5
	var margin = 80.0
	var side = randi() % 4
	match side:
		0: return Vector2(randf_range(center.x - half.x, center.x + half.x), center.y - half.y - margin)
		1: return Vector2(center.x + half.x + margin, randf_range(center.y - half.y, center.y + half.y))
		2: return Vector2(randf_range(center.x - half.x, center.x + half.x), center.y + half.y + margin)
		_: return Vector2(center.x - half.x - margin, randf_range(center.y - half.y, center.y + half.y))

func _is_off_screen() -> bool:
	if not _goblin_node:
		return true
	var screen_rect := Rect2(Vector2.ZERO, get_viewport().get_visible_rect().size)
	return not screen_rect.grow(120.0).has_point(_get_goblin_screen_position())

func _goblin_escape() -> void:
	_goblin_alive = false
	if _goblin_node:
		_goblin_node.queue_free()
		_goblin_node = null
	_hide_direction_indicator()
	emit_signal("goblin_escaped")
	EventBus.emit_signal("goblin_escaped")
	_next_spawn_time = TimeService.game_time + randf_range(30.0, 60.0)

func _on_goblin_killed() -> void:
	_goblin_alive = false
	_goblin_node = null
	_hide_direction_indicator()
	emit_signal("goblin_killed")
	# 下一只间隔变短
	_next_spawn_time = TimeService.game_time + randf_range(20.0, 40.0)

func _on_enemy_killed(enemy: Node, _killer: Node) -> void:
	if enemy == _goblin_node:
		_on_goblin_killed()

func _show_direction_indicator() -> void:
	if _direction_layer:
		return
	_direction_layer = CanvasLayer.new()
	_direction_layer.layer = 4
	_direction_indicator = UiArt.texture_rect("res://assets/art/ui/goblin_direction_arrow.tres", Vector2(72, 72), TextureRect.STRETCH_KEEP_ASPECT_CENTERED)
	_direction_indicator.pivot_offset = Vector2(36, 36)
	_direction_indicator.modulate = Color(1.0, 0.96, 0.72, 0.95)
	_direction_layer.add_child(_direction_indicator)
	add_child(_direction_layer)
	_update_direction_indicator()

func _hide_direction_indicator() -> void:
	if _direction_layer:
		_direction_layer.queue_free()
	_direction_layer = null
	_direction_indicator = null

func _update_direction_indicator() -> void:
	if not _goblin_alive or not _goblin_node or not _direction_indicator:
		return
	var viewport_size := get_viewport().get_visible_rect().size
	var center := viewport_size * 0.5
	var target_screen := _get_goblin_screen_position()
	var dir := target_screen - center
	if dir.length_squared() < 1.0:
		dir = Vector2.UP
	var margin := 56.0
	var clamped := Vector2(
		clamp(target_screen.x, margin, viewport_size.x - margin),
		clamp(target_screen.y, margin, viewport_size.y - margin)
	)
	_direction_indicator.position = clamped - _direction_indicator.size * 0.5
	_direction_indicator.rotation = dir.angle() + PI * 0.5
	_direction_indicator.visible = true

func _get_goblin_screen_position() -> Vector2:
	if not _goblin_node:
		return Vector2.ZERO
	return get_viewport().get_canvas_transform() * _goblin_node.global_position

func _get_player_position() -> Vector2:
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		return players[0].global_position
	return Vector2(2508, 1411.5)

func _get_spawn_parent() -> Node:
	if get_tree().current_scene:
		return get_tree().current_scene
	if get_parent():
		return get_parent()
	return get_tree().root
