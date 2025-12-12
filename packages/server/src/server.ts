import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	TextDocumentSyncKind,
	InitializeResult,
	Connection
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
	getLanguageService,
	LanguageService,
	LanguageSettings,
	SchemaConfiguration
} from "vscode-json-languageservice";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { SchemaPatcher } from "./json-schema";

/**
 * Encapsulates the Sins language server logic.
 */
class SinsLanguageServer {
	/** A connection to the VS Code client. */
	private connection: Connection;

	/** A manager for open text documents. */
	private documents: TextDocuments<TextDocument>;

	/** A cached string to the workspace folder this server is operating on. */
	private workspaceFolder: string | null = null;

	/** The JSON language service instance. */
	private jsonLanguageService: LanguageService;

	private schemaPatcher: SchemaPatcher;


	constructor() {
		// Create the LSP connection.
		this.connection = createConnection(ProposedFeatures.all);

		// Create a manager for open text documents.
		this.documents = new TextDocuments(TextDocument);

		this.schemaPatcher = new SchemaPatcher();

		// Initialize the JSON language service.
		this.jsonLanguageService = getLanguageService({
			schemaRequestService: async (uri) => {
				if (uri.startsWith("file")) {
					const fsPath = fileURLToPath(uri);
					const fileName = path.basename(fsPath);
					try {
						const content = await fs.promises.readFile(fsPath, "utf-8");
						const schema = JSON.parse(content);
						this.schemaPatcher.apply(fileName, schema);
						return JSON.stringify(schema);
					}
					catch (error) {
						return Promise.reject(error);
					}
				}
				return Promise.reject(`Schema request failed for: ${uri}`);
			}
		});

		// Bind the connection event listeners.
		this.connection.onInitialize(this.onInitialize.bind(this));
		this.connection.onInitialized(this.onInitialized.bind(this));

		// Bind the document event listeners.
		this.documents.onDidOpen(this.onDidOpen.bind(this));
		this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
		this.documents.onDidClose(this.onDidClose.bind(this));

		// Make the text document manager listen on the connection for open, change, and close text document events.
		this.documents.listen(this.connection);

		// Start the server.
		this.connection.listen();
	}


	/**
	 * Called when the client starts the server.
	 * This is where server capabilities are decalred.
	 */
	private onInitialize(params: InitializeParams): InitializeResult {
		// TODO: rootUri @deprecated — in favour of workspaceFolders
		this.workspaceFolder = params.rootUri;
		this.connection.console.log(`[Server(${process.pid}) ${this.workspaceFolder}] Initialization starting.`);

		this.configureSchemas();

		return {
			capabilities: {
				// Tell the client that this server supports code completion.
				completionProvider: {
					resolveProvider: true
				},
				// Tell the client how to sync text documents (Full vs Incremental).
				textDocumentSync: TextDocumentSyncKind.Incremental
			}
		};
	}


	/**
	 * Configures the JSON language service with schemas.
	 */
	private configureSchemas(): void {
		// Resolve path to the schemas folder.
		const schemasPath = path.join(__dirname, "resources", "schemas");

		// The new or modified schemas folder.
		const schemasPath_dev = path.join(__dirname, "resources", "schemas-dev");

		// The type schema is unknown and requires further investigation.
		const unknown_schema: string = pathToFileURL(path.join(schemasPath_dev, "unknown-schema.json")).toString();

		// Define schema associations.
		//-------------------------

		const schemas_uniforms: SchemaConfiguration[] = [
			// Uniforms have special handling for filename to schema matching.
			{
				fileMatch: ["action.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "action-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["attack_target_type.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "attack-target-type-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["attack_target_type_group.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "attack-target-type-group-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["culture.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "culture-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["debris.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "debris-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["diplomatic_tag.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "diplomatic-tags-schema.json")).toString()
			},
			{
				fileMatch: ["exotic.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "exotic-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["formation.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "formation-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["front_end.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "front-end-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["future_orbit.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "future-orbit-uniforms-schema.json")).toString()
			},
			{
				// TODO: Vanilla file has problems.
				// - Property fillings is not allowed.
				fileMatch: ["galaxy_generator.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "galaxy-generator-uniforms-schema.json")).toString()
			},
			{
				// NOTE: This is an empty JSON object.
				fileMatch: ["game_renderer.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "game-renderer-uniforms-schema.json")).toString()
			},
			{
				// TODO: Vanilla file has problems.
				// - Property unmet_target_gravity_well_must_have_unit_type_constraint is not allowed.
				// - Property target_filter_unit_type_names is not allowed.
				// - Property inline_icons is not allowed.
				fileMatch: ["gui.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "gui-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["hud_skin.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "hud-skin-uniforms-schema.json")).toString()
			},
			{
				// TODO: Property weight is not allowed.
				fileMatch: ["loot.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "loot-uniforms-schema.json")).toString()
			},
			{
				// TODO: Vanilla file has problems.
				// - Property groups is not allowed.
				// - Property social_system is not allowed.
				fileMatch: ["main_view.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "main-view-uniforms-schema.json")).toString()
			},
			{
				// TODO: Vanilla file has problems.
				// - Property trigger_tooltip_desc_override is not allowed.
				// - Property trigger_hud_definition is not allowed.
				// - Property trigger_hud_icon_structure_override is not allowed.
				// - Property build_structure_tooltip_desc_override is not allowed.
				// - Property build_structure_tooltip_title_override is not allowed.
				// - Property hyperspace_time is not allowed.
				// - Property chains is not allowed.
				// - Property reward_hud_definition is not allowed.
				fileMatch: ["missions.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "mission-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["music.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "music-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["notification.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "notification-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["objective_based_structure.uniforms"],
				uri: unknown_schema
			},
			{
				fileMatch: ["planet.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "planet-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["planet_track.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "planet-track-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["player.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "player-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["player_ai.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "player-ai-uniforms-schema.json")).toString()
			},
			{
				// TODO: Vanilla file has problems.
				// - Property passive_hate_per_factional_victory_obtained is not allowed.
				// - Property minutes_allowed_for_trade_offer_cooldown is not allowed.
				fileMatch: ["player_ai_diplomacy.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "player-ai-diplomacy-schema.json")).toString()
			},
			{
				fileMatch: ["player_color.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "player-color-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["player_race.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "player-race-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["random_skybox_filling.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "random-skybox-fillings-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["research.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "research-uniforms-schema.json")).toString()
			},
			{
				// TODO: Vanilla file has problems.
				// @dlc_scenarios
				// @dlc_multiplayer_scenarios
				// - Property scenarios is not allowed.
				fileMatch: ["scenario.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "scenario-uniforms-schema.json")).toString()
			},
			{
				// TODO: This has TWO schemas that need to be investigated.
				// - special-operation-unit-uniforms-schema.json   <--- using this one
				// - special_operation_unit_uniforms-schema.json
				fileMatch: ["special_operation_unit.uniforms"],
				// This one has two new fields compared to the other.
				// - overwrite_special_operation_unit_kinds
				// - will_ignore_planet_slot_costs
				uri: pathToFileURL(path.join(schemasPath, "special-operation-unit-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["start_mode.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "start-mode-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["strikecraft.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "strikecraft-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["target_filter.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "target-filter-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["tutorial.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "tutorial-uniforms-schema.json")).toString()
			},
			{
				// TODO: Vanilla file has problems.
				// - Property raw_distance_per_gravity_well_distance is not allowed.
				fileMatch: ["unit.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "unit-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["unit_bar.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "unit-bar-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["unit_build.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "unit-build-uniforms-schema.json")).toString()
			},
			{
				// TODO: Vanilla file has problems.
				// - Property can_use_weapons is not allowed.
				// - Property can_use_missile_weapons is not allowed.
				// - Property can_update_weapon_cooldown_progress is not allowed.
				// - Property can_use_weapons_when_crippled is not allowed.
				// - Property can_hyperspace is not allowed.
				// - Property can_be_targeted_by_allies is not allowed.
				// - Property can_be_targeted_by_enemies is not allowed.
				// - Property can_be_damaged is not allowed.
				// - Property can_planet_be_damaged is not allowed.
				// - Property can_planet_update_track_upgrade_progress is not allowed.
				// - Property can_have_hull_restored is not allowed.
				// - Property can_have_armor_restored is not allowed.
				// - Property can_have_shields_bypassed is not allowed.
				// - Property can_have_shields_restored is not allowed.
				// - Property can_have_shields_burst_restored is not allowed.
				// - Property can_passively_regenerate_hull is not allowed.
				// - Property can_passively_regenerate_armor is not allowed.
				// - Property can_passively_regenerate_shields is not allowed.
				// - Property can_use_active_abilities is not allowed.
				// - Property can_use_abilities_when_crippled is not allowed.
				// - Property can_update_ability_cooldown_progress is not allowed.
				// - Property can_update_build_progress is not allowed.
				// - Property can_be_colonized is not allowed.
				// - Property can_launch_or_dock_strikecraft is not allowed.
				// - Property can_have_any_strikecraft_launched is not allowed.
				// - Property can_update_unit_production is not allowed.
				// - Property can_create_retargeting_torpedoes is not allowed.
				// - Property can_update_unit_item_build_progress is not allowed.
				fileMatch: ["unit_mutation.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "unit-mutation-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["unit_tag.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "unit-tag-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["user_interface.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "user-interface-uniforms-schema.json")).toString()
			},
			{
				fileMatch: ["weapon.uniforms"],
				uri: pathToFileURL(path.join(schemasPath, "weapon-uniforms-schema.json")).toString()
			}
		];

		const schemas_entities: SchemaConfiguration[] = [
			{
				fileMatch: ["*.ability"],
				uri: pathToFileURL(path.join(schemasPath, "ability-schema.json")).toString()
			},
			{
				fileMatch: ["*.action_data_source"],
				uri: pathToFileURL(path.join(schemasPath, "action-data-source-schema.json")).toString()
			},
			{
				fileMatch: ["*.buff"],
				uri: pathToFileURL(path.join(schemasPath, "buff-schema.json")).toString()
			},
			{
				fileMatch: ["*.entity_manifest"],
				uri: pathToFileURL(path.join(schemasPath_dev, "entity-manifest-schema.json")).toString()
			},
			{
				fileMatch: ["*.exotic"],
				uri: pathToFileURL(path.join(schemasPath, "exotic-schema.json")).toString()
			},
			{
				fileMatch: ["*.flight_pattern"],
				uri: pathToFileURL(path.join(schemasPath, "flight-pattern-schema.json")).toString()
			},
			{
				fileMatch: ["*.formation"],
				uri: pathToFileURL(path.join(schemasPath, "formation-schema.json")).toString()
			},
			{
				fileMatch: ["*.npc_reward"],
				uri: pathToFileURL(path.join(schemasPath, "npc-reward-schema.json")).toString()
			},
			{
				fileMatch: ["*.player"],
				uri: pathToFileURL(path.join(schemasPath, "player-schema.json")).toString()
			},
			{
				fileMatch: ["*.research_subject"],
				uri: pathToFileURL(path.join(schemasPath, "research-subject-schema.json")).toString()
			},
			{
				fileMatch: ["*.start_mode"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.unit"],
				uri: pathToFileURL(path.join(schemasPath, "unit-schema.json")).toString()
			},
			{
				fileMatch: ["*.unit_item"],
				uri: pathToFileURL(path.join(schemasPath, "unit-item-schema.json")).toString()
			},
			{
				fileMatch: ["*.unit_skin"],
				uri: pathToFileURL(path.join(schemasPath, "unit-skin-schema.json")).toString()
			},
			{
				fileMatch: ["*.weapon"],
				uri: pathToFileURL(path.join(schemasPath, "weapon-schema.json")).toString()
			}
		];

		const schemas_brushes: SchemaConfiguration[] = [
			{
				fileMatch: ["*.brush"],
				uri: pathToFileURL(path.join(schemasPath, "brush-schema.json")).toString()
			}
		];

		const schemas_colors: SchemaConfiguration[] = [
			{
				fileMatch: ["*.named_colors"],
				uri: unknown_schema
			}
		];

		const schemas_cursors: SchemaConfiguration[] = [
			{
				fileMatch: ["*.cursor"],
				uri: unknown_schema
			}
		];

		const schemas_death_sequences: SchemaConfiguration[] = [
			{
				fileMatch: ["*.death_sequence"],
				uri: unknown_schema
			}
		];

		const schemas_effects: SchemaConfiguration[] = [
			{
				fileMatch: ["*.beam_effect"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.exhaust_trail_effect"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.particle_effect"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.shield_effect"],
				uri: unknown_schema
			}
		];

		const schemas_fonts: SchemaConfiguration[] = [
			{
				fileMatch: ["*.font"],
				uri: unknown_schema
			}
		];

		const schemas_gdpr: SchemaConfiguration[] = [
			{
				fileMatch: ["*.gdpr_accept_data"],
				uri: unknown_schema
			}
		];

		const schemas_gravity_well_props: SchemaConfiguration[] = [
			{
				fileMatch: ["*.gravity_well_props"],
				uri: unknown_schema
			}
		];

		const schemas_gui: SchemaConfiguration[] = [
			{
				fileMatch: ["*.gui"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.button_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.drop_box_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.label_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.list_box_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.reflect_box_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.scroll_bar_style"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.text_entry_box_style"],
				uri: unknown_schema
			}
		];

		const schemas_localized_text: SchemaConfiguration[] = [
			{
				fileMatch: ["*.localized_text"],
				uri: unknown_schema
			}
		];

		const schemas_mesh_materials: SchemaConfiguration[] = [
			{
				fileMatch: ["*.mesh_materials"],
				uri: unknown_schema
			}
		];

		const schemas_player_colors: SchemaConfiguration[] = [
			{
				fileMatch: ["*.player_color_group"],
				uri: unknown_schema
			}
		];

		const schemas_player_icons: SchemaConfiguration[] = [
			{
				fileMatch: ["*.player_icon"],
				uri: unknown_schema
			}
		];

		const schemas_player_portraits: SchemaConfiguration[] = [
			{
				fileMatch: ["*.player_portrait"],
				uri: unknown_schema
			}
		];

		const schemas_scenarios: SchemaConfiguration[] = [
			{
				fileMatch: ["*.scenario"],
				uri: unknown_schema
			}
		];

		const schemas_skyboxes: SchemaConfiguration[] = [
			{
				fileMatch: ["*.skybox"],
				uri: unknown_schema
			}
		];

		const schemas_sounds: SchemaConfiguration[] = [
			{
				fileMatch: ["*.sound"],
				uri: unknown_schema
			}
		];

		const schemas_texture_animations: SchemaConfiguration[] = [
			{
				fileMatch: ["*.texture_animation"],
				uri: unknown_schema
			}
		];

		const schemas_welcome: SchemaConfiguration[] = [
			{
				fileMatch: ["*.welcome_message"],
				uri: unknown_schema
			},
			{
				fileMatch: ["*.playtime_message"],
				uri: unknown_schema
			}
		];

		const schemas_mod: SchemaConfiguration[] = [
			{
				fileMatch: [".mod_meta_data"],
				uri: unknown_schema
			},
			{
				fileMatch: ["settings_override.json"],
				uri: unknown_schema
			}
		];

		const schemas: SchemaConfiguration[] = [
			...schemas_uniforms,
			...schemas_entities,
			...schemas_brushes,
			...schemas_colors,
			...schemas_cursors,
			...schemas_death_sequences,
			...schemas_effects,
			...schemas_fonts,
			...schemas_gdpr,
			...schemas_gravity_well_props,
			...schemas_gui,
			...schemas_localized_text,
			...schemas_mesh_materials,
			...schemas_player_colors,
			...schemas_player_icons,
			...schemas_player_portraits,
			...schemas_scenarios,
			...schemas_skyboxes,
			...schemas_sounds,
			...schemas_texture_animations,
			...schemas_welcome,
			...schemas_mod
		];

		const settings: LanguageSettings = {
			schemas: schemas
		};

		this.jsonLanguageService.configure(settings);
	}


	/**
	 * Called after the handshake is complete.
	 */
	private onInitialized(): void {
		this.connection.console.log("Server initialized.");
	}


	/**
	 * Called when a document is opened.
	 */
	private onDidOpen(event: { document: TextDocument }): void {
		this.connection.console.log(`[Server(${process.pid}) ${this.workspaceFolder}] Document opened: ${event.document.uri}`);
	}


	/**
	 * Called when a document content changes.
	 * This is usually where validation logic triggers.
	 */
	private onDidChangeContent(change: { document: TextDocument }): void {
		this.validateTextDocument(change.document);
	}


	/**
	 * Called when a document is closed.
	 */
	private onDidClose(event: { document: TextDocument }): void {
		// Clear diagnostics for closed files if necessary with empty array.
		// TODO: This is over optimistic.
		this.connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
	}


	/**
	 * Core logic for validating a document.
	 */
	private async validateTextDocument(textDocument: TextDocument): Promise<void> {
		const text = textDocument.getText();

		// TODO: Just logging the length for now.
		this.connection.console.log(`Validating ${textDocument.uri} (${text.length} characters in length.)`);

		// Parse the document as JSON.
		const jsonDocument = this.jsonLanguageService.parseJSONDocument(textDocument);

		// Validate the document against the configured schemas.
		const diagnostics = await this.jsonLanguageService.doValidation(textDocument, jsonDocument);

		// Send the diagnostics to the client.
		this.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	}


}


// Start the language server instance.
//--------------------------------------------------
void new SinsLanguageServer();
