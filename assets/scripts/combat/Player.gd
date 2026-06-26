extends Actor

## Player - 玩家角色

class_name Player

@export var mana_max: float = 50.0
@export var mana_regen: float = 2.0   # 每秒回复

var mana_current: float
var invincible_until: float = 0.0
var invincible_duration: float = 0.5   # 受伤后无敌时间
var active_skill_cooldown: float = 0.0
var shield_hp: float = 0.0

func _ready() -> void:
	super._ready()
	mana_current = mana_max

func _get_collision_type() -> int:
	return CollisionComponent.Type.PLAYER

func take_damage(amount: float, source: Node = null) -> void:
	if TimeService.game_time < invincible_until:
		return
	if shield_hp > 0:
		var absorbed = min(shield_hp, amount)
		shield_hp -= absorbed
		amount -= absorbed
		if amount <= 0:
			return
	super.take_damage(amount, source)
	invincible_until = TimeService.game_time + invincible_duration

func _die() -> void:
	alive = false
	GameApp.end_game()
	queue_free()

func _physics_process(delta: float) -> void:
	if not alive or GameApp.state != GameApp.GameState.PLAYING:
		move_and_slide()
		return
	# 读取输入
	var input_dir = Vector2(
		Input.get_axis("move_left", "move_right"),
		Input.get_axis("move_up", "move_down")
	).normalized()
	# 移动 + 击退
	velocity = input_dir * move_speed + knockback_velocity
	move_and_slide()
	# 衰减击退
	knockback_velocity = knockback_velocity.move_toward(Vector2.ZERO, delta * 500)

func _process(delta: float) -> void:
	if not alive or GameApp.state != GameApp.GameState.PLAYING:
		return
	# 自然回复法力
	mana_current = min(mana_max, mana_current + mana_regen * delta)
