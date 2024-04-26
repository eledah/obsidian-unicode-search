import {App, Editor, prepareFuzzySearch, prepareSimpleSearch, renderMatches, SuggestModal} from "obsidian";
import {CharacterMaybeMatch, CharacterSearch} from "./characterSearch";
import {CharacterService} from "../service/characterService";
import {
    ELEMENT_FREQUENT,
    ELEMENT_RECENT,
    INSERT_CHAR_INSTRUCTION,
    INSTRUCTION_DISMISS,
    NAVIGATE_INSTRUCTION
} from "./visualElements";
import {toHexadecimal} from "../../libraries/helpers/toHexadecimal";
import {getRandomItem} from "../../libraries/helpers/getRandomItem";
import {MaybeUsedCharacter, UsedCharacter} from "../../libraries/types/codepoint/character";
import {fillNullCharacterMatchScores} from "../../libraries/comparison/fillNullCharacterMatchScores";
import {compareCharacterMatches} from "../../libraries/comparison/compareCharacterMatches";
import {ReadCache} from "../../libraries/types/readCache";
import {mostRecentUses} from "../../libraries/helpers/mostRecentUses";
import {averageUseCount} from "../../libraries/helpers/averageUseCount";
import {UsageDisplayStatistics} from "../../libraries/types/usageDisplayStatistics";
import {ParsedUsageInfo} from "../../libraries/types/savedata/usageData";

type UsedCharacterSearch = CharacterSearch<MaybeUsedCharacter>;
type MaybeUsedCharacterMatch = CharacterMaybeMatch<MaybeUsedCharacter>;

export class FuzzySearchModal extends SuggestModal<UsedCharacterSearch> {
    private usageStatistics: ReadCache<UsageDisplayStatistics>;

    public constructor(
        app: App,
        private readonly editor: Editor,
        private readonly characterService: CharacterService,
    ) {
        super(app);

        super.setInstructions([
            NAVIGATE_INSTRUCTION,
            INSERT_CHAR_INSTRUCTION,
            INSTRUCTION_DISMISS,
        ]);

        // Purposefully ignored result
        this.setRandomPlaceholder().then();

        this.usageStatistics = new ReadCache(async () => {
            const usedCharacters = await characterService.getUsed();
            return {
                topThirdRecentlyUsed: mostRecentUses(usedCharacters).last() ?? new Date(0),
                averageUseCount: averageUseCount(usedCharacters),
            } as UsageDisplayStatistics;
        })
    }

    public override async getSuggestions(query: string): Promise<UsedCharacterSearch[]> {
        const allCharacters = await this.characterService.getAll();

        const queryEmpty = query == null || query.length < 1;
        const isHexSafe = query.length <= 4 && !query.contains(" ");

        const codepointSearch = isHexSafe ? prepareSimpleSearch(query) : ((text: string) => null);
        const fuzzyNameSearch = prepareFuzzySearch(query);

        const toNullMatch = (character: MaybeUsedCharacter): MaybeUsedCharacterMatch => ({
            item: character,
            match: {
                codepoint: null,
                name: null
            }
        });

        const toSearchQueryMatch = (character: MaybeUsedCharacter): MaybeUsedCharacterMatch => ({
            item: character,
            match: {
                codepoint: codepointSearch(toHexadecimal(character)),
                name: fuzzyNameSearch(character.name)
            }
        });

        const matchedNameOrCodepoint = (match: UsedCharacterSearch | MaybeUsedCharacterMatch) => match.match.name != null || match.match.codepoint != null;

        const prepared = queryEmpty
            ? allCharacters
                .map(toNullMatch)
            : allCharacters
                .map(toSearchQueryMatch)
                .filter(matchedNameOrCodepoint);

        return prepared
            .sort(compareCharacterMatches)
            .map(fillNullCharacterMatchScores);

        /* TODO [NEXT]: REFACTOR */
    }

    public override async renderSuggestion(item: UsedCharacterSearch, container: HTMLElement): Promise<void> {
        const char = item.item;

        container.addClass("plugin", "unicode-search", "result-item");

        container.createDiv({
            cls: "character-preview",
        }).createSpan({
            text: char.codepoint,
        });

        const matches = container.createDiv({
            cls: "character-match",
        });

        const text = matches.createDiv({
            cls: "character-name",
        });

        renderMatches(text, item.item.name, item.match.name.matches);

        if (item.match.codepoint.matches.length > 0) {
            const codepoint = matches.createDiv({
                cls: "character-codepoint",
            });

            renderMatches(codepoint, toHexadecimal(item.item), item.match.codepoint.matches);
        }

        const detail = container.createDiv({
            cls: "detail",
        });

        const usageStats = await this.usageStatistics.getValue();

        /* The type hinting doesn't work, and shows as an error in the IDE (or the type is wrong) */
        const maybeUsedChar = char as Partial<ParsedUsageInfo>
		const showLastUsed = maybeUsedChar.lastUsed != null && maybeUsedChar.lastUsed >= usageStats.topThirdRecentlyUsed;
		const showUseCount = maybeUsedChar.useCount != null && maybeUsedChar.useCount >= usageStats.averageUseCount;

		const attributes = detail.createDiv({
			cls: "attributes",
		});

		if (showLastUsed) {
			attributes.createDiv(ELEMENT_RECENT);
		}

		if (showUseCount) {
			attributes.createDiv(ELEMENT_FREQUENT);
		}

        /* TODO [NEXT]: Sorting, with usage data; prioritize used characters, merge with the rest for search. */
    }

    public override onChooseSuggestion(item: UsedCharacterSearch, evt: MouseEvent | KeyboardEvent): void {
        this.editor.replaceSelection(item.item.codepoint);

        // I don't want to await this, its more of a side effect
        this.characterService.recordUsage(item.item.codepoint)
            .then(undefined, (error) => console.error("Failed to record character usage", {err: error}));
    }

    public override async onNoSuggestion(): Promise<void> {
        await this.setRandomPlaceholder();
    }

    private async setRandomPlaceholder(): Promise<void> {
        const placeholder = `Unicode search: ${getRandomItem((await this.characterService.getAllCharacters())).name}`;
        super.setPlaceholder(placeholder);
    }

}
