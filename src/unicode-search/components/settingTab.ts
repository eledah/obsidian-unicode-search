import {App, Plugin, PluginSettingTab, Setting} from "obsidian";
import {UNICODE_PLANES_ALL} from "../../libraries/data/unicodePlanes";
import {UnicodeBlock} from "../../libraries/types/unicode/unicodeBlock";

import {asHexadecimal} from "../../libraries/helpers/asHexadecimal";
import {CharacterService} from "../service/characterService";
import {SettingsStore} from "../service/settingsStore";
import {CodepointInterval} from "../../libraries/types/codepoint/codepointInterval";
import {UnicodePlane} from "../../libraries/types/unicode/unicodePlane";
import {UNICODE_CHARACTER_CATEGORIES} from "../../libraries/data/unicodeCharacterCategories";
import {UnicodeGeneralCategoryGroup} from "../../libraries/types/unicode/unicodeGeneralCategoryGroup";
import {UnicodeGeneralCategory} from "../../libraries/types/unicode/unicodeGeneralCategory";
import {DataInitializer} from "../service/dataInitializer";

export class SettingTab extends PluginSettingTab {

    private rendered = false;

    constructor(
        app: App,
        plugin: Plugin,
        private readonly characterService: CharacterService,
        private readonly settingsStore: SettingsStore,
        private readonly initializer: DataInitializer,
    ) {
        super(app, plugin);
        this.containerEl.addClass("plugin", "unicode-search", "setting-tab")
    }

    override async display(): Promise<void> {
        if (this.rendered) {
            return;
        }

        const container = this.containerEl.createDiv({cls: "filter-settings"});

        new Setting(container)
            .setHeading()
            .setName("Unicode Character Filters")
            .setDesc(
                "Here you can set which characters would you like to be included " +
                "or excluded from the plugins search results. " +
                "Toggle the headings to display the options."
            )
        ;

        await this.displayFilterSettings(container);
        await this.addCustomCharacterSettings(container);

        this.rendered = true;
    }

    override hide(): Promise<void> {
        return this.initializer.initializeData();
    }

    private async displayFilterSettings(container: HTMLElement) {
        new Setting(container)
            .setHeading()
            .setName("General Categories")
            .setDesc("Include or exclude any Unicode general character categories.")
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(visible => categoryFilterDiv.toggleClass("hidden", !visible))
            )
        ;

        const categoryFilterDiv = container.createDiv({cls: ["group-container", "hidden"]});

        for (const category of UNICODE_CHARACTER_CATEGORIES) {
            await this.addCharacterCategoryFilter(categoryFilterDiv, category);
        }

        new Setting(container)
            .setHeading()
            .setName("Planes and Blocks")
            .setDesc("Include or exclude of any Unicode blocks.")
            .addToggle(toggle => toggle
                .setValue(false)
                .onChange(visible => planesFilterDiv.toggleClass("hidden", !visible))
            )
        ;

        const planesFilterDiv = container.createDiv({cls: ["group-container", "hidden"]});

        for (const plane of UNICODE_PLANES_ALL) {
            await this.addCharacterPlaneFilters(planesFilterDiv, plane);
        }
    }

    private async addCharacterCategoryFilter(container: HTMLElement, categoryGroup: UnicodeGeneralCategoryGroup) {
        const categoryGroupContainer = container.createDiv({cls: "item-container"});

        new Setting(categoryGroupContainer)
            .setHeading()
            .setName(categoryGroup.name)
        ;

        const categoryContainer = categoryGroupContainer.createDiv({cls: "items-list"});

        for (const category of categoryGroup.categories) {
            await SettingTab.addCharacterCategoryFilterToggle(categoryContainer, this.settingsStore, category);
        }
    }

    private async addCharacterPlaneFilters(container: HTMLElement, plane: UnicodePlane) {
        const planeContainer = container.createDiv({cls: "item-container"});

        new Setting(planeContainer)
            .setHeading()
            .setName(createFragment(fragment => {
                fragment.createSpan().appendText(plane.description);
                SettingTab.codepointFragment(fragment, plane.interval)
            }))
        ;

        const blocksContainer = planeContainer.createDiv({cls: "blocks-list"});

        for (const block of plane.blocks) {
            await SettingTab.addCharacterBlockFilterToggle(blocksContainer, this.settingsStore, block);
        }
    }

    private static async addCharacterBlockFilterToggle(
        container: HTMLElement,
        options: SettingsStore,
        block: UnicodeBlock
    ) {
        /* Low: try to redo more effectively, we always get a plane worth of blocks */
        const blockIncluded = await options.getCharacterBlock(block.interval);

        new Setting(container)
            .setName(block.description)
            .setDesc(createFragment(fragment => SettingTab.codepointFragment(fragment, block.interval)))
            .addToggle(input => input
                .setValue(blockIncluded)
                .onChange((value) => options.setCharacterBlock(block.interval, value))
            );
    }

    private static async addCharacterCategoryFilterToggle(
        container: HTMLElement,
        options: SettingsStore,
        category: UnicodeGeneralCategory
    ) {
        /* Low: try to redo more effectively, we always get a plane worth of blocks */
        const blockIncluded = await options.getCharacterCategory(category.abbreviation);

        new Setting(container)
            .setName(category.name)
            .setDesc(category.description)
            .addToggle(input => input
                .setValue(blockIncluded)
                .onChange((value) => options.setCharacterCategory(category.abbreviation, value))
            );
    }

    private static codepointFragment(parent: DocumentFragment, interval: CodepointInterval): DocumentFragment {
        parent
            .createSpan({cls: ["character-codepoint", "monospace"],})
            .setText(`${asHexadecimal(interval.start)}－${asHexadecimal(interval.end)}`);

        return parent;
    }

    private async addCustomCharacterSettings(container: HTMLElement) {
        new Setting(container)
            .setHeading()
            .setName("Favorite Characters")
            .setDesc("Here you can add custom characters which are toggled by Obsidian hotkeys");

        for (let i = 1; i <= 3; i++) {
            const character = await this.settingsStore.getCustomCharacter(i as 1 | 2 | 3);
            new Setting(container)
                .setName(`Favorite Character ${i}`)
                .setDesc(`Select a Unicode character for hotkey ${i}`)
                .addText(text => text
                    .setValue(character)
                    .onChange(async (value) => {
                        await this.settingsStore.setCustomCharacter(i as 1 | 2 | 3, value);
                    })
                );
        }
    }

}