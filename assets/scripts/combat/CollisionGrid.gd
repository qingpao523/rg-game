## CollisionGrid - 空间网格碰撞系统
## 自研轻量圆形/AABB 碰撞，避免大量怪物和弹幕压垮通用物理系统

extends RefCounted

class GridCell:
	var nodes: Array[CollisionComponent] = []

	var _dirty: bool = false

	func add(n: CollisionComponent) -> void:
		nodes.append(n)
		_dirty = true

	func remove(n: CollisionComponent) -> void:
		nodes.erase(n)
		_dirty = true

	func get_nodes() -> Array[CollisionComponent]:
		return nodes

var _cell_size: int = 64   # 网格单元像素大小
var _world_bounds: Rect2 = Rect2(-1000, -1000, 2000, 2000)
var _grid: Dictionary = {}   # "x,y" -> GridCell
var _all_components: Array[CollisionComponent] = []

func _init(cell_size: int = 64, bounds: Rect2 = Rect2(-1000, -1000, 2000, 2000)):
	_cell_size = cell_size
	_world_bounds = bounds

func register(comp: CollisionComponent) -> void:
	_all_components.append(comp)
	_insert(comp)

func unregister(comp: CollisionComponent) -> void:
	_all_components.erase(comp)
	_remove(comp)

func update(comp: CollisionComponent) -> void:
	_remove(comp)
	_insert(comp)

func _insert(comp: CollisionComponent) -> void:
	var key = _to_key(comp.position)
	if not _grid.has(key):
		_grid[key] = GridCell.new()
	_grid[key].add(comp)

func _remove(comp: CollisionComponent) -> void:
	var key = _to_key(comp.position)
	if _grid.has(key):
		var cell = _grid[key]
		cell.remove(comp)
		if cell.get_nodes().is_empty():
			_grid.erase(key)

func _to_key(pos: Vector2) -> String:
	var cx = int(floor(pos.x / _cell_size))
	var cy = int(floor(pos.y / _cell_size))
	return "%d,%d" % [cx, cy]

## 获取指定位置周围 3x3 网格内的碰撞组件
func query_neighbors(pos: Vector2, exclude: CollisionComponent = null) -> Array[CollisionComponent]:
	var cx = int(floor(pos.x / _cell_size))
	var cy = int(floor(pos.y / _cell_size))
	var result: Array[CollisionComponent] = []
	for dx in range(-1, 2):
		for dy in range(-1, 2):
			var key = "%d,%d" % [cx + dx, cy + dy]
			if _grid.has(key):
				for n in _grid[key].get_nodes():
					if n != exclude:
						result.append(n)
	return result
