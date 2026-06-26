extends Node

## ObjectPool - 通用对象池
## 避免频繁创建销毁带来的 GC 抖动

class PoolEntry:
	var node: Node
	var active: bool = false

	func _init(n: Node) -> void:
		node = n

var _pools: Dictionary = {}   # group_name -> [PoolEntry]

func create_group(group_name: String, scene: PackedScene, prewarm_count: int = 0) -> void:
	if _pools.has(group_name):
		return
	_pools[group_name] = []
	for i in range(prewarm_count):
		var instance = scene.instantiate()
		instance.visible = false
		instance.set_process(false)
		instance.set_physics_process(false)
		add_child(instance)
		_pools[group_name].append(PoolEntry.new(instance))

func acquire(group_name: String) -> Node:
	if not _pools.has(group_name):
		push_error("[ObjectPool] 池不存在: ", group_name)
		return null
	for entry in _pools[group_name]:
		if not entry.active:
			entry.active = true
			entry.node.visible = true
			entry.node.set_process(true)
			entry.node.set_physics_process(true)
			return entry.node
	push_warning("[ObjectPool] 池耗尽，扩展: ", group_name)
	return null   # 调用方需处理扩容

func release_node(group_name: String, node: Node) -> void:
	if not _pools.has(group_name):
		return
	for entry in _pools[group_name]:
		if entry.node == node:
			entry.active = false
			entry.node.visible = false
			entry.node.set_process(false)
			entry.node.set_physics_process(false)
			entry.node.position = Vector2.ZERO
			return

func release_all(group_name: String) -> void:
	if not _pools.has(group_name):
		return
	for entry in _pools[group_name]:
		if entry.active:
			entry.active = false
			entry.node.visible = false
			entry.node.set_process(false)
			entry.node.set_physics_process(false)
			entry.node.position = Vector2.ZERO

func clear_group(group_name: String) -> void:
	if not _pools.has(group_name):
		return
	for entry in _pools[group_name]:
		entry.node.queue_free()
	_pools.erase(group_name)

func clear_all() -> void:
	for group_name in _pools.keys():
		clear_group(group_name)
