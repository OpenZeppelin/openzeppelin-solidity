Contributing to OpenZeppelin Contracts
=======

We really appreciate and value contributions to OpenZeppelin Contracts. Please take 5' to review the items listed below to make sure that your contributions are merged as soon as possible.

## Contribution guidelines

Smart contracts manage value and are highly vulnerable to errors and attacks. We have very strict [guidelines], please make sure to review them!

## Creating Pull Requests (PRs)

As a contributor, you are expected to fork this repository, work on your own fork and then submit pull requests. The pull requests will be reviewed and eventually merged into the main repo. See ["Fork-a-Repo"](https://help.github.com/articles/fork-a-repo/) for how this works.

## A typical workflow

1) Make sure your fork is up to date with the main repository:

```
cd openzeppelin-contracts
git remote add upstream https://github.com/OpenZeppelin/openzeppelin-contracts.git
git fetch upstream
git pull --rebase upstream master
```
NOTE: The directory `openzeppelin-contracts` represents your fork's local copy.

2) Branch out from `master` into `fix/some-bug-#123`:
(Postfixing #123 will associate your PR with the issue #123 and make everyone's life easier =D)
```
git checkout -b fix/some-bug-#123
```

3) Make your changes, add your files, commit, and push to your fork.

```
git add SomeFile.js
git commit "Fix some bug #123"
git push origin fix/some-bug-#123
```

4) Run tests, linter, etc. This can be done by running local continuous integration and make sure it passes.

```bash
npm test
npm run lint
```

5) Go to [github.com/OpenZeppelin/openzeppelin-contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) in your web browser and issue a new pull request.

*IMPORTANT* Read the PR template very carefully and make sure to follow all the instructions. These instructions
refer to some very important conditions that your PR must meet in order to be accepted, such as making sure that all tests pass, JS linting tests pass, Solidity linting tests pass, etc.

6) Maintainers will review your code and possibly ask for changes before your code is pulled in to the main repository. We'll check that all tests pass, review the coding style, and check for general code correctness. If everything is OK, we'll merge your pull request and your code will be part of OpenZeppelin Contracts.

*IMPORTANT* Please pay attention to the maintainer's feedback, since its a necessary step to keep up with the standards OpenZeppelin Contracts attains to.

## All set!

If you have any questions, feel free to post them to github.com/OpenZeppelin/openzeppelin-contracts/issues.

Finally, if you're looking to collaborate and want to find easy tasks to start, look at the issues we marked as ["Good first issue"](https://github.com/OpenZeppelin/openzeppelin-contracts/labels/good%20first%20issue).

Thanks for your time and code!

[guidelines]: GUIDELINES.md
