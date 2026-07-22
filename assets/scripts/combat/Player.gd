extends Actor

## Player - 玩家角色

class_name Player

@export var mana_max: float = 50.0
@export var mana_regen: float = 2.0
@export var active_skill_id: String = "magic_missile"

var mana_current: float
var invincible_until: float = 0.0
var invincible_duration: float = 0.5
var shield_hp: float = 0.0
const VISUAL_TARGET_HEIGHT := 145.0
var _mobile_move_dir: Vector2 = Vector2.ZERO
var _visual_animator: Node = null
var _ending_game: bool = false

func _ready() -> void:
	super._ready()
	mana_current = mana_max
	add_to_group("player")
	_visual_animator = get_node_or_null("VisualAnimator")
	EventBus.mobile_move_changed.connect(_on_mobile_move_changed)

	var character_art_id := "taoist"
	# 从 GameSession 同步属性
	if GameSession.character_id != "":
		character_art_id = GameSession.character_id
		max_hp = GameSession.max_health
		hp = GameSession.health
		move_speed = GameSession.move_speed_bonus
		mana_max = GameSession.max_mana
		mana_current = GameSession.mana
		active_skill_id = GameSession.active_skill_id
	_apply_character_art(character_art_id)

func _apply_character_art(character_id: String) -> void:
	var sprite := $Sprite as Sprite2D
	if not sprite:
		return
	var tex := load("res://assets/art/characters/%s_idle.tres" % character_id) as Texture2D
	if tex:
		sprite.texture = tex
	_apply_visual_scale(sprite)
	_bind_visual_animator()

func _apply_visual_scale(sprite: Sprite2D) -> void:
	var tex := sprite.texture
	if not tex:
		return
	var texture_height := maxf(tex.get_size().y, 1.0)
	var scale_value := VISUAL_TARGET_HEIGHT / texture_height
	sprite.scale = Vector2(scale_value, scale_value)

func _bind_visual_animator() -> void:
	if not _visual_animator:
		_visual_animator = get_node_or_null("VisualAnimator")
	if _visual_animator and _visual_animator.has_method("bind_sprite"):
		_visual_animator.bind_sprite($Sprite)

func take_damage(amount: float, source: Node = null) -> void:
	if TimeService.game_time < invincible_until:
		return
	if shield_hp > 0:
		var absorbed = min(shield_hp, amount)
		shield_hp -= absorbed
		amount -= absorbed
		if amount <= 0:
			return
	var previous_hp := hp
	super.take_damage(amount, source)
	var actual_damage := maxf(previous_hp - hp, 0.0)
	if actual_damage > 0.0:
		if _visual_animator and _visual_animator.has_method("play_hit_flash"):
			_visual_animator.play_hit_flash()
		EventBus.emit_signal("player_damaged", int(ceil(actual_damage)), source)
	invincible_until = TimeService.game_time + invincible_duration
	# 更新 GameSession
	GameSession.health = hp

func _die() -> void:
	if _ending_game:
		return
	alive = false
	_ending_game = true
	if _visual_animator and _visual_animator.has_method("play_death"):
		_visual_animator.play_death(0.36)
	# 使用 call_deferred 避免在物理回调中切换场景
	call_deferred("_do_end_game")

func _do_end_game() -> void:
	if is_inside_tree():
		await get_tree().create_timer(0.28).timeout
	GameApp.end_game()

func _physics_process(delta: float) -> void:
	super._physics_process(delta)

	if not alive:
		move_and_slide()
		return
	if GameApp.state != GameApp.GameState.PLAYING:
		move_and_slide()
		return

	# 输入移动
	var input_dir = Vector2(
		Input.get_axis("move_left", "move_right"),
		Input.get_axis("move_up", "move_down")
	).normalized()
	if input_dir == Vector2.ZERO and _mobile_move_dir != Vector2.ZERO:
		input_dir = _mobile_move_dir
	if input_dir.length() > 0:
		pass

	velocity = input_dir * move_speed + knockback_velocity
	move_and_slide()

	# 朝向：朝移动方向翻转 Sprite
	var sprite = $Sprite as Sprite2D
	if sprite and velocity.length_squared() > 1.0:
		# 左右翻转
		var facing_right = velocity.x > 0.1
		var facing_left = velocity.x < -0.1
		if facing_right:
			sprite.scale.x = abs(sprite.scale.x)
		elif facing_left:
			sprite.scale.x = -abs(sprite.scale.x)
	if _visual_animator and _visual_animator.has_method("set_motion_velocity"):
		_visual_animator.set_motion_velocity(velocity)

func _process(delta: float) -> void:
	if not alive:
		return
	if GameApp.state != GameApp.GameState.PLAYING:
		return
	mana_current = min(mana_max, mana_current + mana_regen * delta)
	GameSession.mana = mana_current

func _on_mobile_move_changed(direction: Vector2) -> void:
	_mobile_move_dir = direction.limit_length(1.0)

func play_cast_visual() -> void:
	if _visual_animator and _visual_animator.has_method("play_cast_pulse"):
		_visual_animator.play_cast_pulse()
