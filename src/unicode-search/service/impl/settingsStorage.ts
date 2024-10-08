import {RootDataStore} from "../rootDataStore";
import {SettingsStore} from "../settingsStore";
import {BlockFilter, CategoryFilter, FilterData} from "../../../libraries/types/savedata/filterData";
import {UnicodeSearchError} from "../../errors/unicodeSearchError";
import {CodepointInterval} from "../../../libraries/types/codepoint/codepointInterval";
import {intervalsEqual} from "../../../libraries/helpers/intervalsEqual";
import {intervalWithin} from "../../../libraries/helpers/intervalWithin";
import {CharacterCategoryType} from "../../../libraries/data/characterCategory";

export class SettingsStorage implements SettingsStore {

    constructor(private readonly store: RootDataStore) {
    }

    async getFilter(): Promise<FilterData> {
        return (await this.store.getSettings()).filter
    }

    async getCharacterBlock(block: CodepointInterval): Promise<boolean> {
        return (await this.getBlockFilters())
            .some(blockFilter => intervalsEqual(blockFilter, block) && blockFilter.included);
    }

    async setCharacterBlock(block: CodepointInterval, set: boolean): Promise<void> {
        const settings = await this.store.getSettings();
        const planeIndex = settings.filter.planes.findIndex(pf => intervalWithin(pf, block));

        if (planeIndex < 0) {
            throw new UnicodeSearchError(`Block doesn't belong to any codepoint plane. ${block}`);
        }

        const blockIndex = settings.filter.planes[planeIndex].blocks.findIndex(bf => intervalsEqual(bf, block));

        if (blockIndex < 0) {
            throw new UnicodeSearchError(`Block doesn't exist within a plane. ${block}`);
        }

        settings.filter.planes[planeIndex].blocks[blockIndex].included = set;
        settings.modified = true;

        await this.store.overwriteSettings(settings);
    }

    async getCharacterCategory(category: CharacterCategoryType): Promise<boolean> {
        return (await this.getCategoryFilters())
            .some(filter => filter.abbreviation === category && filter.included);
    }

    async setCharacterCategory(category: CharacterCategoryType, set: boolean): Promise<void> {
        const settings = await this.store.getSettings();
        const groupIndex = settings.filter.categoryGroups.findIndex(gf => gf.abbreviation === category[0]);

        if (groupIndex < 0) {
            throw new UnicodeSearchError(`Codepoint category group doesn't exist. ${category}: ${category[0]}`);
        }

        const categoryIndex = settings.filter.categoryGroups[groupIndex].categories.findIndex(cf => cf.abbreviation === category);

        if (categoryIndex < 0) {
            throw new UnicodeSearchError(`Block doesn't exist within a plane. ${category}`);
        }

        settings.filter.categoryGroups[groupIndex].categories[categoryIndex].included = set;
        settings.modified = true;

        await this.store.overwriteSettings(settings);
    }

    private async getBlockFilters(): Promise<BlockFilter[]> {
        return (await this.getFilter()).planes
            .flatMap(plane => plane.blocks);
    }

    private async getCategoryFilters(): Promise<CategoryFilter[]> {
        return (await this.getFilter()).categoryGroups
            .flatMap(group => group.categories);
    }

    async getCustomCharacter(index: 1 | 2 | 3): Promise<string> {
        const settings = await this.store.getSettings();
        return settings[`customCharacter${index}`] || '';
    }

    async setCustomCharacter(index: 1 | 2 | 3, character: string): Promise<void> {
        const settings = await this.store.getSettings();
        settings[`customCharacter${index}`] = character;
        await this.store.overwriteSettings(settings);
    }
}
