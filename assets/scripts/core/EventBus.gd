extends Node

## EventBus - 全局事件总线
## 游戏内所有模块通过信号解耦通信

signal game_state_changed(new_state: int)
signal player_damaged(amount: int, source: Node)
signal player_healed(amount: int)
signal player_died
signal player_leveled_up(new_level: int)
signal enemy_spawned(enemy: Node)
signal enemy_killed(enemy: Node, killer: Node)
signal skill_acquired(skill_id: String, level: int)
signal skill_upgraded(skill_id: String, new_level: int)
signal skill_evolved(base_id: String, evolved_id: String)
signal active_skill_requested
signal mobile_move_changed(direction: Vector2)
signal goblin_spawned(goblin: Node)
signal goblin_escaped
signal wave_changed(wave: int)
signal experience_gained(amount: int, total: int, needed: int)
signal choice_made(choice_index: int)
