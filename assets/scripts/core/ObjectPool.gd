extends Node

## ObjectPool - 通用对象池
## 避免频繁创建销毁带来的 GC 抖动

class PoolEntry:
	var node: Node
	var active: bool = false

	func _init(n: Node) -> void:
		node = n

var _pools: Dictionary = {}   # group_name -> [PoolEntry]
const INACTIVE_POSITION := Vector2(-100000.0, -100000.0)

func create_group(group_name: String, scene: PackedScene, prewarm_count: int = 0) -> void:
	if _pools.has(group_name):
		return
	_pools[group_name] = []
	for i in range(prewarm_count):
		var instance = scene.instantiate()
		_set_node_active(instance, false)
		add_child(instance)
		_pools[group_name].append(PoolEntry.new(instance))

func acquire(group_name: String) -> Node:
	if not _pools.has(group_name):
		push_error("[ObjectPool] 池不存在: ", group_name)
		return null
	for entry in _pools[group_name]:
		if not entry.active:
			entry.active = true
			_set_node_active(entry.node, true)
			return entry.node
	# 自动扩容：创建新实例加入池中
	var scene = _find_scene(group_name)
	if scene:
		var instance = scene.instantiate()
		_set_node_active(instance, false)
		add_child(instance)
		_set_node_active(instance, true)
		var entry = PoolEntry.new(instance)
		entry.active = true
		_pools[group_name].append(entry)
		print("[ObjectPool] 自动扩容: ", group_name)
		return instance
	push_error("[ObjectPool] 池耗尽且无法扩容: ", group_name)
	return null

func _find_scene(group_name: String) -> PackedScene:
	# 尝试加载已知场景
	var scenes = {
		"enemies": "res://assets/prefabs/enemy.tscn",
		"projectiles": "res://assets/prefabs/projectile.tscn",
		"effects": "res://assets/prefabs/hit_effect.tscn",
	}
	if scenes.has(group_name):
		return load(scenes[group_name])
	return null

func release_node(group_name: String, node: Node) -> void:
	if not _pools.has(group_name):
		return
	for entry in _pools[group_name]:
		if entry.node == node:
			entry.active = false
			_set_node_active(entry.node, false)
			return

func release_all(group_name: String) -> void:
	if not _pools.has(group_name):
		return
	for entry in _pools[group_name]:
		if entry.active:
			entry.active = false
			_set_node_active(entry.node, false)

func clear_group(group_name: String) -> void:
	if not _pools.has(group_name):
		return
	for entry in _pools[group_name]:
		entry.node.queue_free()
	_pools.erase(group_name)

func clear_all() -> void:
	for group_name in _pools.keys():
		clear_group(group_name)

func _set_node_active(node: Node, active: bool) -> void:
	if node is CanvasItem:
		node.visible = active
	node.set_process(active)
	node.set_physics_process(active)
	if node is Node2D and not active:
		node.position = INACTIVE_POSITION
	_set_collision_enabled(node, active)

func _set_collision_enabled(node: Node, active: bool) -> void:
	if node is CollisionShape2D:
		node.set_deferred("disabled", not active)
	elif node is CollisionPolygon2D:
		node.set_deferred("disabled", not active)
	elif node is Area2D:
		node.set_deferred("monitoring", active)
		node.set_deferred("monitorable", active)
	for child in node.get_children():
		_set_collision_enabled(child, active)
