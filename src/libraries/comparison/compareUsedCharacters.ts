import {Order} from "../order/order";
import {compareNullable} from "./compareNullable";
import {compareUsageTrackedCharacters} from "./compareUsageTrackedCharacters";
import {MaybeUsedCharacter} from "../types/codepoint/character";
import {compareNumbers} from "./compareNumbers";
import {UsageInfo} from "../types/savedata/usageData";

export function compareUsedCharacters(left: MaybeUsedCharacter, right: MaybeUsedCharacter): Order {
	const order = compareNullable(
		left as UsageInfo,
		right as UsageInfo,
		(l, r) => compareUsageTrackedCharacters(l, r),
	);

	if (order !== Order.Equal) {
		return order;
	}

	return compareNumbers(left.codepoint.codePointAt(0)!, right.codepoint.codePointAt(0)!);
}
