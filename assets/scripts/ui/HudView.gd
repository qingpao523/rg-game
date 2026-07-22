extends CanvasLayer

## HudView - 游戏内 HUD

class_name HudView

var _joystick_area: Control
var _joystick_knob: TextureRect
var _joystick_center: Vector2
var _joystick_radius: float = 58.0

@onready var hp_bar: ProgressBar = $Control/VBox/HPBar
@onready var hp_bar_label: Label = $Control/VBox/HPBar/Label
@onready var mana_bar: ProgressBar = $Control/VBox/ManaBar
@onready var mana_bar_label: Label = $Control/VBox/ManaBar/Label
@onready var exp_bar: ProgressBar = $Control/VBox/ExpBar
@onready var exp_bar_label: Label = $Control/VBox/ExpBar/Label
@onready var level_label: Label = $Control/VBox/LevelLabel
@onready var time_label: Label = $Control/VBox/TimeLabel
@onready var wave_label: Label = $Control/VBox/WaveLabel
@onready var skill_container: HBoxContainer = $Control/VBox/SkillContainer
@onready var pause_button: Button = $Control/VBox/PauseButton
@onready var skill_display: HBoxContainer = $Control/SkillDisplay

func _ready() -> void:
	_apply_mobile_art_layout()
	EventBus.player_damaged.connect(_on_player_damaged)
	EventBus.player_healed.connect(_on_player_healed)
	EventBus.player_leveled_up.connect(_on_leveled_up)
	EventBus.wave_changed.connect(_on_wave_changed)
	EventBus.experience_gained.connect(_on_experience_gained)
	EventBus.skill_acquired.connect(_on_skill_changed)
	EventBus.skill_upgraded.connect(_on_skill_changed)
	pause_button.pressed.connect(_on_pause_pressed)
	# 初始技能显示
	call_deferred("_update_skill_display")

func _apply_mobile_art_layout() -> void:
	var root := $Control as Control
	var view_height: float = maxf(float(root.size.y), 1280.0)
	var skill_slot_y: float = view_height - 346.0
	var joystick_y: float = view_height - 248.0
	var active_button_y: float = view_height - 234.0
	var status_panel := Panel.new()
	status_panel.name = "StatusBackdrop"
	status_panel.position = Vector2(8, 66)
	status_panel.size = Vector2(268, 164)
	status_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	status_panel.add_theme_stylebox_override("panel", _make_status_style())
	root.add_child(status_panel)
	root.move_child(status_panel, 0)

	var alert := UiArt.texture_rect("res://assets/art/ui/catastrophe_alert_bar.tres", Vector2(650, 128), TextureRect.STRETCH_KEEP_ASPECT_CENTERED)
	alert.name = "CatastropheAlertBar"
	alert.position = Vector2(35, 10)
	alert.modulate = Color(1, 1, 1, 0.82)
	root.add_child(alert)
	root.move_child(alert, 1)

	var active_button := UiArt.texture_rect(UiArt.ACTIVE_SKILL_BUTTON, Vector2(112, 112), TextureRect.STRETCH_KEEP_ASPECT_CENTERED)
	active_button.name = "ActiveSkillButtonArt"
	active_button.position = Vector2(552, active_button_y)
	root.add_child(active_button)
	var active_hit := Button.new()
	active_hit.name = "ActiveSkillButton"
	active_hit.position = active_button.position
	active_hit.size = active_button.size
	active_hit.text = ""
	active_hit.add_theme_stylebox_override("normal", UiArt.transparent_panel())
	active_hit.add_theme_stylebox_override("hover", UiArt.transparent_panel())
	active_hit.add_theme_stylebox_override("pressed", UiArt.transparent_panel())
	active_hit.add_theme_stylebox_override("focus", UiArt.transparent_panel())
	active_hit.pressed.connect(func(): EventBus.emit_signal("active_skill_requested"))
	root.add_child(active_hit)

	_create_mobile_joystick(root, Vector2(48, joystick_y))

	UiArt.apply_button_skin(pause_button)
	pause_button.text = "暂停"
	pause_button.get_parent().remove_child(pause_button)
	root.add_child(pause_button)
	pause_button.position = Vector2(608, 28)
	pause_button.size = Vector2(88, 46)
	skill_container.visible = false

	for i in range(6):
		var slot := UiArt.texture_rect(UiArt.SKILL_SLOT, Vector2(82, 82), TextureRect.STRETCH_KEEP_ASPECT_CENTERED)
		slot.name = "SkillSlotArt%d" % i
		slot.position = Vector2(82 + i * 92, skill_slot_y)
		slot.modulate = Color(1, 1, 1, 0.78)
		root.add_child(slot)
		root.move_child(slot, root.get_child_count() - 2)
	skill_display.set_anchors_preset(Control.PRESET_TOP_LEFT)
	skill_display.position = Vector2(82, skill_slot_y)
	skill_display.size = Vector2(544, 82)
	skill_display.custom_minimum_size = Vector2(544, 82)
	skill_display.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.move_child(skill_display, root.get_child_count() - 1)

func _make_status_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.02, 0.018, 0.015, 0.72)
	style.border_color = Color(0.78, 0.58, 0.25, 0.85)
	style.set_border_width_all(2)
	style.set_corner_radius_all(10)
	style.content_margin_left = 12.0
	style.content_margin_top = 8.0
	style.content_margin_right = 12.0
	style.content_margin_bottom = 8.0
	return style

func _create_mobile_joystick(root: Control, joystick_position: Vector2) -> void:
	_joystick_area = Control.new()
	_joystick_area.name = "MobileJoystick"
	_joystick_area.position = joystick_position
	_joystick_area.size = Vector2(168, 168)
	_joystick_area.mouse_filter = Control.MOUSE_FILTER_STOP
	_joystick_area.gui_input.connect(_on_joystick_input)
	root.add_child(_joystick_area)

	var base := UiArt.texture_rect(UiArt.ACTIVE_SKILL_BUTTON, _joystick_area.size, TextureRect.STRETCH_KEEP_ASPECT_CENTERED)
	base.modulate = Color(0.62, 0.72, 0.85, 0.42)
	_joystick_area.add_child(base)

	_joystick_knob = UiArt.texture_rect(UiArt.SKILL_SLOT, Vector2(62, 62), TextureRect.STRETCH_KEEP_ASPECT_CENTERED)
	_joystick_knob.modulate = Color(0.95, 0.9, 0.74, 0.88)
	_joystick_area.add_child(_joystick_knob)
	_joystick_center = _joystick_area.size * 0.5
	_reset_joystick()

func _on_joystick_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			_update_joystick(event.position)
		else:
			_reset_joystick()
	elif event is InputEventScreenDrag:
		_update_joystick(event.position)
	elif event is InputEventMouseButton:
		if event.pressed:
			_update_joystick(event.position)
		else:
			_reset_joystick()
	elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		_update_joystick(event.position)

func _update_joystick(local_pos: Vector2) -> void:
	var offset := local_pos - _joystick_center
	if offset.length() > _joystick_radius:
		offset = offset.normalized() * _joystick_radius
	_joystick_knob.position = _joystick_center + offset - _joystick_knob.size * 0.5
	EventBus.emit_signal("mobile_move_changed", offset / _joystick_radius)

func _reset_joystick() -> void:
	if _joystick_knob:
		_joystick_knob.position = _joystick_center - _joystick_knob.size * 0.5
	EventBus.emit_signal("mobile_move_changed", Vector2.ZERO)

func _process(_delta: float) -> void:
	if not is_instance_valid(GameSession):
		return
	if GameSession.max_health > 0:
		hp_bar.value = GameSession.health / GameSession.max_health * 100.0
	if GameSession.max_mana > 0:
		mana_bar.value = GameSession.mana / GameSession.max_mana * 100.0
	if GameSession.experience_to_next > 0:
		exp_bar.value = float(GameSession.experience) / float(GameSession.experience_to_next) * 100.0
	time_label.text = TimeService.get_elapsed_formatted()
	hp_bar_label.text = "%d/%d" % [GameSession.health, GameSession.max_health]
	mana_bar_label.text = "%d/%d" % [GameSession.mana, GameSession.max_mana]
	exp_bar_label.text = "%d/%d" % [GameSession.experience, GameSession.experience_to_next]

func _on_player_damaged(amount: int, _source: Node) -> void:
	var root := $Control as Control
	root.modulate = Color(1, 0.8, 0.8)
	await get_tree().create_timer(0.1).timeout
	if is_instance_valid(root):
		root.modulate = Color.WHITE

func _on_player_healed(amount: int) -> void:
	pass

func _on_leveled_up(new_level: int) -> void:
	level_label.text = "Lv.%d" % new_level

func _on_experience_gained(_amount: int, _total: int, _needed: int) -> void:
	if GameSession.experience_to_next > 0:
		exp_bar.value = float(GameSession.experience) / float(GameSession.experience_to_next) * 100.0
	exp_bar_label.text = "%d/%d" % [GameSession.experience, GameSession.experience_to_next]

func _on_wave_changed(wave: int) -> void:
	wave_label.text = "第 %d 波" % wave

func _on_pause_pressed() -> void:
	GameApp.pause_game()

func _on_skill_changed(_skill_id: String = "", _level: int = 0) -> void:
	_update_skill_display()

func _update_skill_display() -> void:
	if not is_instance_valid(GameSession):
		return
	for child in skill_display.get_children():
		child.queue_free()
	var skills = GameSession.acquired_skills
	for s in skills:
		var sid = s.id
		var lv = s.level
		var cfg = SkillConfig.get_config(sid)
		var name_str = cfg.get("name", sid)
		var box = Panel.new()
		box.custom_minimum_size = Vector2(82, 82)
		box.size = Vector2(82, 82)
		box.clip_contents = true
		box.mouse_filter = Control.MOUSE_FILTER_IGNORE
		box.add_theme_stylebox_override("panel", UiArt.transparent_panel())
		var icon_rect := UiArt.skill_icon_rect(sid, Vector2(52, 52), TextureRect.STRETCH_KEEP_ASPECT_CENTERED)
		icon_rect.position = Vector2(15, 12)
		var lv_label = Label.new()
		lv_label.text = "Lv.%d" % lv
		lv_label.position = Vector2(6, 58)
		lv_label.size = Vector2(70, 18)
		lv_label.add_theme_font_size_override("font_size", 12)
		lv_label.add_theme_color_override("font_color", Color(0.9, 0.9, 0.5, 1))
		var name_label = Label.new()
		name_label.text = name_str
		name_label.position = Vector2(4, 2)
		name_label.size = Vector2(74, 16)
		name_label.add_theme_font_size_override("font_size", 9)
		name_label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.9, 1))
		name_label.autowrap_mode = TextServer.AUTOWRAP_WORD
		box.add_child(icon_rect)
		box.add_child(lv_label)
		box.add_child(name_label)
		skill_display.add_child(box)
