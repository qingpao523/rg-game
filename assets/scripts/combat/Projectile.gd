extends Area2D

## Projectile - 弹幕/投射物

class_name Projectile

@export var speed: float = 400.0
@export var damage: int = 10
@export var direction: Vector2 = Vector2.RIGHT
@export var pierce: bool = false
@export var lifetime: float = 3.0

var _age: float = 0.0
var _hit_enemies: Array[Node] = []

func _ready() -> void:
	area_entered.connect(_on_hit)
	body_entered.connect(_on_hit)
	$LifeTimer.start(lifetime)
	$LifeTimer.timeout.connect(_die)

func _physics_process(delta: float) -> void:
	position += direction * speed * delta

func _on_hit(hit: Node) -> void:
	if hit.is_in_group("enemy") and hit.has_method("take_damage"):
		if hit in _hit_enemies:
			return
		_hit_enemies.append(hit)
		hit.take_damage(damage)
		if not pierce:
			_die()

func _die() -> void:
	# 对象池释放或销毁
	queue_free()
