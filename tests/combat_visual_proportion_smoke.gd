extends SceneTree

const PLAYER_CASES := ["taoist", "pharaoh", "ice_witch", "samurai", "crusader"]
const ENEMY_CASES := {
	"grunt": Vector2(68.0, 92.0),
	"charger": Vector2(72.0, 104.0),
	"elite": Vector2(110.0, 145.0),
	"ranger": Vector2(68.0, 92.0),
}

func _init() -> void:
	root.size = Vector2i(720, 1280)
	call_deferred("_run")

func _run() -> void:
	await process_frame
	if not await _check_players():
		return
	if not await _check_enemies():
		return
	if not await _check_aura():
		return
	print("COMBAT_VISUAL_PROPORTION_SMOKE_OK")
	quit()

func _check_players() -> bool:
	var session := root.get_node_or_null("/root/GameSession")
	if not session:
		push_error("Missing GameSession autoload")
		quit(1)
		return false
	var scene := load("res://assets/prefabs/player.tscn") as PackedScene
	if not scene:
		push_error("Failed to load player prefab")
		quit(1)
		return false
	for character_id in PLAYER_CASES:
		session.start_new(character_id)
		var player := scene.instantiate()
		root.add_child(player)
		await process_frame
		var sprite := player.get_node_or_null("Sprite") as Sprite2D
		var height := _visual_height(sprite, player)
		if height < 132.0 or height > 158.0:
			push_error("Player visual height should be combat-sized for %s: %.1f" % [character_id, height])
			quit(1)
			return false
		player.queue_free()
		await process_frame
	return true

func _check_enemies() -> bool:
	var scene := load("res://assets/prefabs/enemy.tscn") as PackedScene
	if not scene:
		push_error("Failed to load enemy prefab")
		quit(1)
		return false
	for type in ENEMY_CASES.keys():
		var cfg := EnemyConfig.get_config(type)
		var enemy := scene.instantiate()
		root.add_child(enemy)
		await process_frame
		enemy.set_sprite_by_type(type)
		enemy.scale = Vector2.ONE * cfg.get("scale", 1.0)
		var sprite := enemy.get_node_or_null("Sprite") as Sprite2D
		var height := _visual_height(sprite, enemy)
		var range := ENEMY_CASES[type] as Vector2
		if height < range.x or height > range.y:
			push_error("Enemy visual height out of range for %s: %.1f expected=%s" % [type, height, range])
			quit(1)
			return false
		enemy.queue_free()
		await process_frame
	return true

func _check_aura() -> bool:
	var scene := load("res://assets/prefabs/effect_aura.tscn") as PackedScene
	if not scene:
		push_error("Failed to load aura prefab")
		quit(1)
		return false
	var owner := Node2D.new()
	root.add_child(owner)
	var aura := scene.instantiate()
	var sprite := aura.get_node_or_null("Sprite") as Sprite2D
	var tex := load("res://assets/art/effects/thunder_cloud.tres") as Texture2D
	if tex and sprite:
		sprite.texture = tex
	aura.setup("雷云", 1.0, 1.5, 250.0, owner, null)
	root.add_child(aura)
	await process_frame
	var width := _visual_width(sprite, aura)
	if width < 150.0 or width > 240.0:
		push_error("Aura visual width should not dominate combat view: %.1f" % width)
		quit(1)
		return false
	aura.queue_free()
	owner.queue_free()
	return true

func _visual_height(sprite: Sprite2D, owner: Node2D) -> float:
	if not sprite or not sprite.texture:
		return 0.0
	return sprite.texture.get_size().y * absf(sprite.scale.y) * absf(owner.scale.y)

func _visual_width(sprite: Sprite2D, owner: Node2D) -> float:
	if not sprite or not sprite.texture:
		return 0.0
	return sprite.texture.get_size().x * absf(sprite.scale.x) * absf(owner.scale.x)
