import {CodepointKey} from "./codepointKey";
import {CodepointAttribute} from "./codepointAttribute";

export type Char = string
export type Codepoint = number;

export type UnicodeCodepoint = CodepointKey & CodepointAttribute
export type Codepoints = Array<UnicodeCodepoint>


