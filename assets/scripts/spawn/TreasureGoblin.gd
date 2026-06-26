extends Area2D

## TreasureGoblin - 宝藏哥布林

class_name TreasureGoblin

@export var move_speed: float = 150.0
@export var escape_timer: float = 8.0
@export var gold_reward_min: int = 50
@export var gold_reward_max: int = 100
@export var exp_reward: int = 30

var _direction: Vector2
var _elapsed: float = 0.0
var _alive: bool = true

func _ready() -> void:
	# 朝远离玩家的方向逃跑
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		var player = players[0]
		_direction = (global_position - player.global_position).normalized()
	else:
		_direction = Vector2(randf_range(-1, 1), randf_range(-1, 1)).normalized()
	area_entered.connect(_on_hit)

func _physics_process(delta: float) -> void:
	if not _alive:
		return
	position += _direction * move_speed * delta
	_elapsed += delta

func _on_hit(hit: Node) -> void:
	if hit.has_method("take_damage") and hit.is_in_group("player"):
		_die()

func _die() -> void:
	if not _alive:
		return
	_alive = false
	GameSession.add_experience(exp_reward)
	# 金币奖励
	var gold = randi_range(gold_reward_min, gold_reward_max)
	print("[Goblin] 击杀! 经验+%d, 金币+%d" % [exp_reward, gold])
	EventBus.emit_signal("enemy_killed", self, get_tree().get_first_node_in_group("player"))
	queue_free()
