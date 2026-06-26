extends CanvasLayer

## PauseView - 暂停界面

class_name PauseView

@onready var panel: Panel = $Panel
@onready var resume_button: Button = $Panel/VBoxContainer/ResumeButton
@onready var quit_button: Button = $Panel/VBoxContainer/QuitButton

func _ready() -> void:
	hide()
	resume_button.pressed.connect(_on_resume)
	quit_button.pressed.connect(_on_quit)

func show_pause() -> void:
	show()
	resume_button.grab_focus()

func _on_resume() -> void:
	hide()
	GameApp.resume_game()

func _on_quit() -> void:
	hide()
	GameApp.resume_game()   # 恢复时间再退出
	GameApp.return_to_menu()
