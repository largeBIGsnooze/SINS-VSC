/**
 * The game data is the "source of truth". If the game runs with a file, the schema is wrong, not the file.
 * Several vanilla game files to not conform to the provided JSON schemas.
 *
 * The schemas should be updated to avoid hitting users with "fake" errors about their data.
 * But we should also avoid modifying the official schemas directly which makes updating them later hard.
 *
 * This code modifies the schema in memory before the Language Service sees it by injecting changes at runtime.
 */


/**
 * A function that modifies a schema object in place.
 */
type PatchFunction = (schema: any) => void;


/**
 * Manages runtime patches for JSON schemas.
 */
export class SchemaPatcher {
	private patches: Map<string, PatchFunction>;


	constructor() {
		this.patches = new Map();
		this.register("galaxy-generator-uniforms-schema.json", SchemaPatch.galaxy_generator_uniforms);
		this.register("mission-uniforms-schema.json", SchemaPatch.mission_uniforms);
	}


	/**
	 * Registers a patch function for a specific schema file.
	 */
	private register(fileName: string, patch: PatchFunction): void {
		this.patches.set(fileName, patch);
	}


	/**
	 * Applies a registered patch to the given schema object if one exists.
	 * @returns The modified schema object or the original if no patch exists.
	 */
	public apply(fileName: string, schema: any): any {
		const patch: PatchFunction | undefined = this.patches.get(fileName);
		if (patch) {
			patch(schema);
		}
		return schema;
	}


}


class SchemaPatch {


	public static galaxy_generator_uniforms(schema: any): void {
		schema.properties = schema.properties || {};
		schema.properties["fillings"] = { type: "object" };
	}


	public static mission_uniforms(schema: any): void {
		schema.properties = schema.properties || {};
		schema.properties["build_structure_tooltip_title_override"] = { type: "string" };
		schema.properties["build_structure_tooltip_desc_override"] = { type: "string" };
		schema.properties["trigger_hud_icon_structure_override"] = { type: "string" };
		schema.properties["trigger_hud_definition"] = { type: "object" };
		schema.properties["reward_hud_definition"] = { type: "object" };
		try {
			const main_mission_chains = schema.properties["main_mission_chains"];
			if (main_mission_chains?.items?.properties) {

				let chains: any = undefined; // copy to side-operations

				const operation_chains = main_mission_chains.items.properties["operation_chains"];
				if (operation_chains?.items?.properties) {

					chains = operation_chains.items.properties["chains"];
					if (chains?.items?.properties) {

						// Triggers
						const trigger = chains.items.properties["trigger"];
						if (trigger?.items?.properties) {
							trigger.items.properties["trigger_tooltip_desc_override"] = { type: "string" };
						}

						// Rewards
						const reward = chains.items.properties["reward"];
						if (reward?.items?.properties) {
							const spawn_unit_reward = reward.items.properties["spawn_unit_reward"];
							if (spawn_unit_reward?.properties) {
								spawn_unit_reward.properties["hyperspace_time"] = { type: "number" };
							}
						}

					}
				}

				const side_operations = main_mission_chains.items.properties["side_operations"];
				if (side_operations?.properties) {
					side_operations.properties["chains"] = chains;
				}

			}
		} catch (error) {
			// TODO: Swallowing for now, which is safer than crashing the server.
		}
	}


}
