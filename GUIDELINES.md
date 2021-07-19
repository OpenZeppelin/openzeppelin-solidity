Design Guidelines
=======

These are some global design goals in OpenZeppelin Contracts.

#### D0 - Security in Depth
We strive to provide secure, tested, audited code. To achieve this, we need to match intention with function. Thus, documentation, code clarity, community review and security discussions are fundamental.

#### D1 - Simple and Modular
Simpler code means easier audits, and better understanding of what each component does. We look for small files, small contracts, and small functions. If you can separate a contract into two independent functionalities you should probably do it.

#### D2 - Naming Matters

We take our time with picking names. Code is going to be written once, and read hundreds of times. Renaming for clarity is encouraged.

#### D3 - Tests

Write tests for all your code. We encourage Test Driven Development so we know when our code is right. Even though not all code in the repository is tested at the moment, we aim to test every line of code in the future.

#### D4 - Check preconditions and post-conditions

A very important way to prevent vulnerabilities is to catch a contract’s inconsistent state as early as possible. This is why we want functions to check pre- and post-conditions for executing its logic. When writing code, ask yourself what you are expecting to be true before and after the function runs, and express it in code.

#### D5 - Code Consistency

Consistency on the way classes are used is paramount to an easier understanding of the library. The codebase should be as unified as possible. Read existing code and get inspired before you write your own. Follow the style guidelines. Don’t hesitate to ask for help on how to best write a specific piece of code.

#### D6 - Regular Audits
Following good programming practices is a way to reduce the risk of vulnerabilities, but professional code audits are still needed. We will perform regular code audits on major releases, and hire security professionals to provide independent review.

# Style Guidelines

The design guidelines have quite a high abstraction level. These style guidelines are more concrete and easier to apply, and also more opinionated. We value clean code and consistency, and those are prerequisites for us to include new code in the repository. Before proposing a change, please read these guidelines and take some time to familiarize yourself with the style of the existing codebase.

## Solidity code

In order to be consistent with all the other Solidity projects, we follow the
[official recommendations documented in the Solidity style guide](http://solidity.readthedocs.io/en/latest/style-guide.html).

Any exception or additions specific to our project are documented below.

* Try to avoid acronyms and abbreviations.

* All state variables should be private.

* Private state variables should have an underscore prefix.

    ```
    contract TestContract {
      uint256 private _privateVar;
      uint256 internal _internalVar;
    }
    ```

* Parameters must not be prefixed with an underscore.

    ```
    function test(uint256 testParameter1, uint256 testParameter2) {
    ...
    }
    ```

* Internal and private functions should have an underscore prefix.

    ```
    function _testInternal() internal {
      ...
    }
    ```

    ```
    function _testPrivate() private {
      ...
    }
    ```

* Events should be emitted immediately after the state change that they
  represent, and consequently they should be named in past tense.

    ```
    function _burn(address who, uint256 value) internal {
      super._burn(who, value);
      emit TokensBurned(who, value);
    }
    ```

  Some standards (e.g. ERC20) use present tense, and in those cases the
  standard specification prevails.
  
* Interface names should have a capital I prefix.

    ```
    interface IERC777 {
    ```


## Tests

* Tests Must be Written Elegantly

    Tests are a good way to show how to use the library, and maintaining them is extremely necessary. Don't write long tests, write helper functions to make them be as short and concise as possible (they should take just a few lines each), and use good variable names.

* Tests Must not be Random

    Inputs for tests should not be generated randomly. Accounts used to create test contracts are an exception, those can be random. Also, the type and structure of outputs should be checked.
