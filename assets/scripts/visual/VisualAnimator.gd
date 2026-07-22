extends Node

## VisualAnimator - procedural visual motion for single-frame sprites.

class_name VisualAnimator

@export var sprite_path: NodePath = ^"../Sprite"
@export var idle_bob_amplitude: float = 2.4
@export var idle_bob_speed: float = 3.2
@export var move_bob_amplitude: float = 4.8
@export var move_bob_speed: float = 10.0
@export var move_tilt_degrees: float = 5.0

var current_state: String = "idle"

var _sprite: Sprite2D
var _base_position: Vector2 = Vector2.ZERO
var _base_scale: Vector2 = Vector2.ONE
var _base_modulate: Color = Color.WHITE
var _motion_velocity: Vector2 = Vector2.ZERO
var _facing_sign: float = 1.0
var _time: float = 0.0
var _cast_timer: float = 0.0
var _cast_duration: float = 0.22
var _hit_timer: float = 0.0
var _hit_duration: float = 0.14
var _death_timer: float = 0.0
var _death_duration: float = 0.34
var _death_active: bool = false

func _ready() -> void:
	_time = randf() * TAU
	if not _sprite:
		var node := get_node_or_null(sprite_path)
		if node is Sprite2D:
			bind_sprite(node)

func bind_sprite(sprite: Sprite2D) -> void:
	_sprite = sprite
	capture_baseline()
	reset_visual()

func capture_baseline() -> void:
	if not _sprite:
		return
	_base_position = _sprite.position
	_base_scale = Vector2(absf(_sprite.scale.x), _sprite.scale.y)
	_base_modulate = _sprite.modulate
	if not is_zero_approx(_sprite.scale.x):
		_facing_sign = signf(_sprite.scale.x)

func reset_visual() -> void:
	_cast_timer = 0.0
	_hit_timer = 0.0
	_death_timer = 0.0
	_death_active = false
	current_state = "idle"
	if not _sprite:
		return
	_sprite.position = _base_position
	_sprite.rotation = 0.0
	_sprite.scale = Vector2(_base_scale.x * _facing_sign, _base_scale.y)
	_sprite.modulate = _base_modulate

func set_motion_velocity(velocity: Vector2) -> void:
	_motion_velocity = velocity
	if absf(velocity.x) > 1.0:
		_facing_sign = signf(velocity.x)
	current_state = "move" if velocity.length_squared() > 25.0 else "idle"

func play_cast_pulse(duration: float = 0.22) -> void:
	_cast_duration = maxf(duration, 0.05)
	_cast_timer = _cast_duration

func play_hit_flash(duration: float = 0.14) -> void:
	_hit_duration = maxf(duration, 0.04)
	_hit_timer = _hit_duration

func play_death(duration: float = 0.34) -> void:
	_death_duration = maxf(duration, 0.05)
	_death_timer = _death_duration
	_death_active = true
	current_state = "death"

func _process(delta: float) -> void:
	if not _sprite:
		return
	_time += delta
	_cast_timer = maxf(_cast_timer - delta, 0.0)
	_hit_timer = maxf(_hit_timer - delta, 0.0)
	if _death_active:
		_death_timer = maxf(_death_timer - delta, 0.0)
	_apply_visual_pose()

func _apply_visual_pose() -> void:
	var bob := 0.0
	var tilt := 0.0
	if current_state == "move":
		bob = sin(_time * move_bob_speed) * move_bob_amplitude
		tilt = deg_to_rad(move_tilt_degrees) * clampf(_motion_velocity.x / 180.0, -1.0, 1.0)
	elif current_state == "idle":
		bob = sin(_time * idle_bob_speed) * idle_bob_amplitude

	var cast_ratio := _cast_timer / _cast_duration if _cast_duration > 0.0 else 0.0
	var cast_wave := sin(cast_ratio * PI)
	var cast_scale := 1.0 + cast_wave * 0.13
	var cast_lift := -cast_wave * 5.0

	var death_ratio := _death_timer / _death_duration if _death_duration > 0.0 else 0.0
	var death_alpha := 1.0
	var death_scale := 1.0
	if _death_active:
		death_alpha = clampf(death_ratio, 0.0, 1.0)
		death_scale = lerpf(0.72, 1.0, death_alpha)

	_sprite.position = _base_position + Vector2(0.0, bob + cast_lift)
	_sprite.rotation = tilt
	_sprite.scale = Vector2(_base_scale.x * _facing_sign * cast_scale * death_scale, _base_scale.y * cast_scale * death_scale)
	_sprite.modulate = _get_modulate(cast_wave, death_alpha)

func _get_modulate(cast_wave: float, death_alpha: float) -> Color:
	var color := _base_modulate
	if cast_wave > 0.0:
		color = color.lerp(Color(0.55, 0.95, 1.0, color.a), cast_wave * 0.45)
	if _hit_timer > 0.0:
		var hit_ratio := _hit_timer / _hit_duration if _hit_duration > 0.0 else 0.0
		color = color.lerp(Color(1.0, 1.0, 1.0, color.a), clampf(hit_ratio, 0.0, 1.0))
	color.a *= death_alpha
	return color
