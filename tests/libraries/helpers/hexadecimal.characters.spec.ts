import {toHexadecimal} from "../../../src/libraries/helpers/toHexadecimal";

/* TODO [NEXT]: Tests */

test(
    "character `b` is `0062`",
    () => {
        expect(toHexadecimal({
            "char": "b",
            "name": "latin small letter b"
        })).toBe("0062")
    }
)
