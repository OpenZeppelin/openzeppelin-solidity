pragma solidity ^0.5.0;

/**
 * @title Strings
 * @dev String operations.
 * via OraclizeAPI - MIT licence
 * https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol
 */
library Strings {
    /**
     * @dev Concatenates two strings.
     */
    function concatenate(string memory a, string memory b) internal pure returns (string memory concatenatedString) {
        bytes memory bytesA = bytes(a);
        bytes memory bytesB = bytes(b);
        string memory concatenatedAB = new string(bytesA.length + bytesB.length);
        bytes memory bytesAB = bytes(concatenatedAB);
        uint concatendatedIndex = 0;
        uint index = 0;
        for (index = 0; index < bytesA.length; index++) {
            bytesAB[concatendatedIndex++] = bytesA[index];
        }
        for (index = 0; index < bytesB.length; index++) {
            bytesAB[concatendatedIndex++] = bytesB[index];
        }

        return string(bytesAB);
    }

    /**
     * @dev Converts a uint256 to a string.
     */
    function uint256ToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory byteString = new bytes(digits);
        uint256 index = digits - 1;
        temp = value;
        while (temp != 0) {
            byteString[index--] = byte(uint8(48 + temp % 10));
            temp /= 10;
        }
        return string(byteString);
    }
}
