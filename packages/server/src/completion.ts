import * as fs from "fs";
import * as path from "path";
import { WorkspaceManager } from "./workspace";
import { CompletionItemKind, CompletionList, Range } from "vscode-json-languageservice";


type Cache = {
	textures: Set<string>;
	localized_text: Set<string>;
	brushes: Set<string>;
	unit_skins: Set<string>;
}


export class CacheManager {
	private cache: Cache = {
        textures: new Set(),
        localized_text: new Set(),
		brushes: new Set(),
		unit_skins: new Set(),
    };

	public getCache(): Cache {
		return this.cache;
	}

	public setCache(cache: keyof Cache, items: Set<string>): void {
		this.cache[cache].clear();
		for (const item of items) {
			this.cache[cache].add(item);
		}
	}
}

export class CompletionManager {

	public cacheManager: CacheManager;
	private set: Set<string>;

	constructor(cacheManager: CacheManager) {
		this.cacheManager = cacheManager;
		this.set = new Set();
	}

	private async loadLocalisations(rootPath: string, lang: string = "en"): Promise<void> {
		const localized_text: string[] = await WorkspaceManager.findFiles(rootPath, `${lang}.localized_text`);
		const content: string = JSON.parse(await fs.promises.readFile(localized_text[0], "utf-8"));
		for (const k of Object.keys(content)) {
			this.set.add(k);
		}
		this.cacheManager.setCache("localized_text", this.set);
		this.set.clear();
	}

	private async loadBrushes(rootPath: string): Promise<void> {
		const brushes: string[] = await WorkspaceManager.findFiles(rootPath, ".png");
		for (const brush of brushes) {
			this.set.add(path.basename(brush));
			this.set.add(path.basename(brush, path.extname(brush)));
		}
		this.cacheManager.setCache("brushes", this.set);
		this.set.clear();
	}

	private async loadUnitSkins(rootPath: string): Promise<void> {
		const manifest: string[] = await WorkspaceManager.findFiles(rootPath, "unit_skin.entity_manifest");
		const content: any = JSON.parse(await fs.promises.readFile(manifest[0], "utf-8"));
		if (content?.ids) {
			for (const id of content.ids) {
			   this.set.add(id);
		   }
		}
		this.cacheManager.setCache("unit_skins", this.set);
		this.set.clear();
	}


	/*
		this should load .dds only
	*/
	private async loadTextures(rootPath: string): Promise<void> {
		const textures: string[] = await WorkspaceManager.findFiles(rootPath, ".dds");
		for (const texture of textures) {
			this.set.add(path.basename(texture));
			this.set.add(path.basename(texture, path.extname(texture)));
		}
		this.cacheManager.setCache("textures", this.set);
		this.set.clear();
	}

	public async loadFromWorkspace(rootPath: string): Promise<void> {
		await Promise.all([
			this.loadLocalisations(rootPath),
			this.loadTextures(rootPath),
			this.loadBrushes(rootPath),
			this.loadUnitSkins(rootPath)
		]);
	}

	public setCompletionList(identifier: keyof Cache, kind: CompletionItemKind, range: Range): CompletionList {
		return {
			isIncomplete: false,
			items: Array.from(this.cacheManager.getCache()[identifier]).map((e) => {
				return {
					label: e,
					kind: kind,
					textEdit: { range: range, newText: e },
				};
			})
		};
	}
}