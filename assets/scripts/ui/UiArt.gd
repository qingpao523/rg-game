class_name UiArt
extends RefCounted

const BUTTON_NORMAL := "res://assets/art/ui/button_normal.tres"
const BUTTON_HOVER := "res://assets/art/ui/button_hover.tres"
const BUTTON_PRESSED := "res://assets/art/ui/button_pressed.tres"
const CLASS_SELECT_CARD := "res://assets/art/ui/class_select_card.tres"
const UPGRADE_CARD := "res://assets/art/ui/upgrade_card.tres"
const SKILL_SLOT := "res://assets/art/ui/skill_slot.tres"
const ACTIVE_SKILL_BUTTON := "res://assets/art/ui/active_skill_button.tres"
const FALLBACK_SKILL_ICON := "res://assets/art/icons/magic_missile.tres"

static func tex(path: String) -> Texture2D:
	if not ResourceLoader.exists(path):
		push_warning("Missing UI texture: %s" % path)
		return null
	return load(path) as Texture2D

static func skill_icon_path(skill_id: String) -> String:
	var path := "res://assets/art/icons/%s.tres" % skill_id
	if ResourceLoader.exists(path):
		return path
	return FALLBACK_SKILL_ICON

static func skill_icon_rect(skill_id: String, size: Vector2, stretch_mode: int = TextureRect.STRETCH_KEEP_ASPECT_CENTERED) -> TextureRect:
	return texture_rect(skill_icon_path(skill_id), size, stretch_mode)

static func texture_rect(path: String, size: Vector2, stretch_mode: int = TextureRect.STRETCH_SCALE) -> TextureRect:
	var rect := TextureRect.new()
	rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	rect.stretch_mode = stretch_mode
	rect.custom_minimum_size = size
	rect.size = size
	rect.texture = tex(path)
	rect.size = size
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return rect

static func apply_button_skin(button: Button) -> void:
	button.add_theme_stylebox_override("normal", _button_style(BUTTON_NORMAL))
	button.add_theme_stylebox_override("hover", _button_style(BUTTON_HOVER))
	button.add_theme_stylebox_override("pressed", _button_style(BUTTON_PRESSED))
	button.add_theme_stylebox_override("focus", _button_style(BUTTON_HOVER))
	button.add_theme_color_override("font_color", Color(0.96, 0.91, 0.78, 1.0))
	button.add_theme_color_override("font_hover_color", Color(1.0, 0.98, 0.86, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(0.85, 0.68, 0.42, 1.0))

static func transparent_panel() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0, 0, 0, 0)
	return style

static func stylebox_texture(path: String, margins: Vector4 = Vector4(24, 24, 24, 24)) -> StyleBoxTexture:
	var style := StyleBoxTexture.new()
	style.texture = tex(path)
	style.texture_margin_left = margins.x
	style.texture_margin_top = margins.y
	style.texture_margin_right = margins.z
	style.texture_margin_bottom = margins.w
	return style

static func _button_style(path: String) -> StyleBoxTexture:
	var style := StyleBoxTexture.new()
	style.texture = tex(path)
	style.texture_margin_left = 36.0
	style.texture_margin_top = 18.0
	style.texture_margin_right = 36.0
	style.texture_margin_bottom = 18.0
	style.content_margin_left = 18.0
	style.content_margin_top = 8.0
	style.content_margin_right = 18.0
	style.content_margin_bottom = 8.0
	return style
