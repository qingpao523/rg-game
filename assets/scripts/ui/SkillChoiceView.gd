extends CanvasLayer

## SkillChoiceView - 升级三选一 UI
## 每次升级时弹出，显示三个可选技能

class_name SkillChoiceView

signal choice_made(skill_id: String)

var _skills: Array[String] = []
var _picked_from_pool: bool = false

@onready var panel: Panel = $Panel
@onready var title_label: Label = $Panel/TitleLabel
@onready var card_container: HBoxContainer = $Panel/CardContainer

func _ready() -> void:
	hide()

func show_choices(skills: Array[String]) -> void:
	_skills = skills
	# 清空旧卡片
	for child in card_container.get_children():
		child.queue_free()
	# 填充三个选项
	for i in range(min(3, skills.size())):
		var card = _create_skill_card(skills[i], i)
		card_container.add_child(card)
	title_label.text = "选择技能"
	show()

func _create_skill_card(skill_id: String, index: int) -> Panel:
	var cfg = SkillConfig.get_config(skill_id)
	var card = Panel.new()
	card.custom_minimum_size = Vector2(180, 240)
	card.size = Vector2(180, 240)
	card.mouse_filter = Control.MOUSE_FILTER_PASS
	# 名称
	var name_label = Label.new()
	name_label.text = cfg.get("name", skill_id)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.position = Vector2(0, 10)
	name_label.size = Vector2(180, 30)
	# 描述
	var desc_label = Label.new()
	desc_label.text = cfg.get("description", "")
	desc_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	desc_label.position = Vector2(10, 50)
	desc_label.size = Vector2(160, 60)
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	# 标签
	var tags = cfg.get("tags", [])
	var tags_str = " / ".join(tags)
	var tags_label = Label.new()
	tags_label.text = tags_str
	tags_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tags_label.position = Vector2(10, 130)
	tags_label.size = Vector2(160, 40)
	tags_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	# 点击
	var button = Button.new()
	button.text = "选择"
	button.position = Vector2(40, 190)
	button.size = Vector2(100, 30)
	button.pressed.connect(_on_choice_pressed.bind(skill_id, index))
	card.add_child(name_label)
	card.add_child(desc_label)
	card.add_child(tags_label)
	card.add_child(button)
	return card

func _on_choice_pressed(skill_id: String, index: int) -> void:
	hide()
	EventBus.emit_signal("choice_made", index)
	emit_signal("choice_made", skill_id)
