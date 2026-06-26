extends CanvasLayer

## MainMenuView - 主菜单

class_name MainMenuView

var _selected_character: String = ""
var _character_buttons: Array[Button] = []

@onready var start_button: Button = $Panel/StartButton
@onready var char_container: HBoxContainer = $Panel/CharacterContainer

func _ready() -> void:
	start_button.pressed.connect(_on_start_pressed)
	var char_ids = CharacterConfig.get_all_ids()
	for i in range(char_ids.size()):
		var char_id = char_ids[i]
		var cfg = CharacterConfig.get_config(char_id)
		var btn = Button.new()
		btn.text = cfg.get("name", char_id)
		btn.tooltip_text = cfg.get("description", "")
		btn.size = Vector2(140, 160)
		btn.custom_minimum_size = Vector2(140, 160)
		btn.toggle_mode = true
		btn.button_group = ButtonGroup.new()
		btn.pressed.connect(_on_character_selected.bind(char_id))
		char_container.add_child(btn)
		_character_buttons.append(btn)
		if i == 0:
			btn.button_pressed = true
			_selected_character = char_id
	start_button.disabled = (_selected_character == "")

func _on_character_selected(char_id: String) -> void:
	_selected_character = char_id
	start_button.disabled = false

func _on_start_pressed() -> void:
	if _selected_character != "":
		GameApp.start_game(_selected_character)
