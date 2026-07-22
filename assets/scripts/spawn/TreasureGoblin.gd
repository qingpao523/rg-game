extends Actor

## TreasureGoblin - 宝藏哥布林

class_name TreasureGoblin

@export var escape_time: float = 8.0
@export var exp_reward: int = 30

var _escape_direction: Vector2
var _alive: bool = true
var _run_tex: Texture2D

func _ready() -> void:
	super._ready()
	add_to_group("enemy")
	add_to_group("goblin")
	_run_tex = load("res://assets/art/enemies/goblin_run.tres")
	var sprite := $Sprite as Sprite2D
	if sprite:
		sprite.scale = Vector2(0.052, 0.052)
	# 朝远离玩家的方向逃跑
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		var player := players[0] as Node2D
		_escape_direction = (global_position - player.global_position).normalized()
	else:
		_escape_direction = Vector2.RIGHT

func take_damage(amount: float, source: Node = null) -> void:
	if not _alive:
		return
	super.take_damage(amount, source)

func _die() -> void:
	if not _alive:
		return
	_alive = false
	GameSession.add_experience(exp_reward)
	GameSession.add_kill()
	EventBus.emit_signal("enemy_killed", self, get_tree().get_first_node_in_group("player") as Player)
	print("[Goblin] 击杀! 经验+%d" % exp_reward)
	super._die()

func _physics_process(delta: float) -> void:
	if not _alive or GameApp.state != GameApp.GameState.PLAYING:
		move_and_slide()
		return
	velocity = _escape_direction * move_speed
	var sprite := $Sprite as Sprite2D
	if sprite:
		if _run_tex:
			sprite.texture = _run_tex
		var sx: float = abs(sprite.scale.x)
		sprite.scale.x = -sx if velocity.x < 0 else sx
	move_and_slide()

func _process(_delta: float) -> void:
	if not _alive:
		return
	# 超时消失
	if TimeService.game_time > escape_time + 5.0:  # HACK: 实际应该用 timer
		_die()
