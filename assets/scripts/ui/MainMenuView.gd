extends CanvasLayer

## MainMenuView - 主菜单

class_name MainMenuView

var _selected_character: String = ""
var _character_cards: Array = []

@onready var start_button: Button = $Panel/StartButton
@onready var char_container: Container = $Panel/CharacterContainer

func _ready() -> void:
	print("[MainMenuView] _ready 开始")
	start_button.add_theme_font_size_override("font_size", 22)
	UiArt.apply_button_skin(start_button)
	start_button.pressed.connect(_on_start_pressed)
	var char_ids = CharacterConfig.get_all_ids()
	for i in range(char_ids.size()):
		var char_id = char_ids[i]
		var cfg = CharacterConfig.get_config(char_id)
		var card = _create_character_card(char_id, cfg, i)
		char_container.add_child(card)
		_character_cards.append(card)
	start_button.disabled = (_selected_character == "")

func _create_character_card(char_id: String, cfg: Dictionary, _index: int) -> Panel:
	var unlocked = true
	var card = Panel.new()
	card.custom_minimum_size = Vector2(150, 220)
	card.size = Vector2(150, 220)
	card.clip_contents = true
	card.mouse_filter = Control.MOUSE_FILTER_PASS
	if unlocked:
		card.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	card.add_theme_stylebox_override("panel", UiArt.transparent_panel())
	var card_art = UiArt.texture_rect(UiArt.CLASS_SELECT_CARD, card.size)
	card_art.name = "CardArt"
	card_art.set_anchors_preset(Control.PRESET_FULL_RECT)
	card_art.offset_left = 0.0
	card_art.offset_top = 0.0
	card_art.offset_right = 0.0
	card_art.offset_bottom = 0.0
	card.add_child(card_art)

	var center = CenterContainer.new()
	center.size = Vector2(150, 82)
	center.position = Vector2(0, 24)
	var sprite = TextureRect.new()
	sprite.custom_minimum_size = Vector2(76, 76)
	sprite.size = Vector2(76, 76)
	sprite.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var portrait_tex = load("res://assets/art/portraits/%s_portrait.tres" % char_id)
	if portrait_tex:
		sprite.texture = portrait_tex
	if not sprite.texture:
		var tex_path = "res://assets/art/characters/%s_idle.tres" % char_id
		var tex = load(tex_path)
		if tex:
			sprite.texture = tex
		else:
			sprite.modulate = _get_char_color(char_id)
	center.add_child(sprite)
	var name_label = Label.new()
	name_label.text = cfg.get("name", char_id)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.position = Vector2(0, 118)
	name_label.size = Vector2(150, 26)
	name_label.add_theme_font_size_override("font_size", 17)
	name_label.add_theme_color_override("font_color", Color(0.98, 0.92, 0.76, 1))
	var desc_label = Label.new()
	desc_label.text = cfg.get("description", "")
	desc_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	desc_label.position = Vector2(14, 150)
	desc_label.size = Vector2(122, 50)
	desc_label.clip_text = true
	desc_label.add_theme_font_size_override("font_size", 9)
	desc_label.add_theme_color_override("font_color", Color(0.78, 0.74, 0.66, 1))
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD

	if not unlocked:
		desc_label.text = "即将开放"
		desc_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55, 1))
		var overlay = ColorRect.new()
		overlay.color = Color(0, 0, 0, 0.4)
		overlay.size = card.size
		overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
		card.add_child(overlay)

	card.add_child(center)
	card.add_child(name_label)
	card.add_child(desc_label)

	if unlocked:
		var click_area = TextureRect.new()
		click_area.size = card.size
		click_area.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		click_area.mouse_filter = Control.MOUSE_FILTER_STOP
		click_area.modulate = Color.TRANSPARENT
		click_area.gui_input.connect(_on_card_gui_input.bind(char_id, card))
		card.add_child(click_area)
		if char_id == "taoist":
			card.modulate = Color(1, 1, 1, 1)
			_selected_character = char_id
	return card

func _on_card_gui_input(event: InputEvent, char_id: String, card: Panel) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_selected_character = char_id
		start_button.disabled = false
		# 高亮选中卡片、暗淡其他
		for c in _character_cards:
			if c == card:
				c.modulate = Color(1, 1, 1, 1)
			else:
				c.modulate = Color(0.5, 0.5, 0.5, 0.7)

func _on_start_pressed() -> void:
	if _selected_character != "":
		print("[MainMenu] 点击开始冒险, 职业=", _selected_character)
		GameApp.start_game(_selected_character)
	else:
		print("[MainMenu] 未选择职业")

static func _get_char_color(char_id: String) -> Color:
	match char_id:
		"taoist": return Color(0.2, 0.5, 1.0, 1)
		"samurai": return Color(1.0, 0.3, 0.2, 1)
		"pharaoh": return Color(1.0, 0.85, 0.2, 1)
		"ice_witch": return Color(0.2, 0.7, 1.0, 1)
		"crusader": return Color(0.8, 0.4, 0.2, 1)
	return Color.WHITE
