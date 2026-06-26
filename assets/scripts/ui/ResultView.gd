extends CanvasLayer

## ResultView - 结算界面

class_name ResultView

@onready var stats_container: VBoxContainer = $Panel/VBoxContainer/StatsContainer
@onready var title_label: Label = $Panel/VBoxContainer/TitleLabel
@onready var restart_button: Button = $Panel/VBoxContainer/RestartButton
@onready var menu_button: Button = $Panel/VBoxContainer/MenuButton

func _ready() -> void:
	hide()
	restart_button.pressed.connect(_on_restart)
	menu_button.pressed.connect(_on_menu)

func show_result(wave: int, kills: int, level: int, survival_time: float) -> void:
	title_label.text = "战斗结束"
	# 清空旧统计
	for child in stats_container.get_children():
		child.queue_free()
	# 显示数据
	var data = [
		"存活波次：%d" % wave,
		"击杀数：%d" % kills,
		"最终等级：Lv.%d" % level,
		"存活时间：%02d:%02d" % [int(survival_time) / 60, int(survival_time) % 60]
	]
	for line in data:
		var label = Label.new()
		label.text = line
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		stats_container.add_child(label)
	show()

func _on_restart() -> void:
	hide()
	GameApp.start_game(GameSession.character_id)

func _on_menu() -> void:
	hide()
	GameApp.return_to_menu()
