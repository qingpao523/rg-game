extends CanvasLayer

## PauseView - 暂停界面

class_name PauseView

@onready var panel: Panel = $Panel
@onready var resume_button: Button = $Panel/VBoxContainer/ResumeButton
@onready var quit_button: Button = $Panel/VBoxContainer/QuitButton

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_WHEN_PAUSED
	_apply_art_skin()
	hide()
	resume_button.pressed.connect(_on_resume)
	quit_button.pressed.connect(_on_quit)

func _apply_art_skin() -> void:
	var overlay := UiArt.texture_rect("res://assets/art/ui/pause_overlay.tres", Vector2(720, 1280), TextureRect.STRETCH_SCALE)
	overlay.name = "PauseOverlayArt"
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.offset_left = 0.0
	overlay.offset_top = 0.0
	overlay.offset_right = 0.0
	overlay.offset_bottom = 0.0
	add_child(overlay)
	move_child(overlay, 0)
	panel.add_theme_stylebox_override("panel", UiArt.transparent_panel())
	var panel_art := UiArt.texture_rect("res://assets/art/ui/pause_panel.tres", panel.size, TextureRect.STRETCH_SCALE)
	panel_art.name = "PausePanelArt"
	panel_art.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel_art.offset_left = 0.0
	panel_art.offset_top = 0.0
	panel_art.offset_right = 0.0
	panel_art.offset_bottom = 0.0
	panel.add_child(panel_art)
	panel.move_child(panel_art, 0)
	UiArt.apply_button_skin(resume_button)
	UiArt.apply_button_skin(quit_button)

func show_pause() -> void:
	show()
	resume_button.grab_focus()

func _unhandled_key_input(event: InputEvent) -> void:
	if visible and event.keycode == KEY_ESCAPE and event.pressed:
		_on_resume()

func _on_resume() -> void:
	hide()
	GameApp.resume_game()

func _on_quit() -> void:
	hide()
	GameApp.resume_game()   # 恢复时间再退出
	GameApp.return_to_menu()
