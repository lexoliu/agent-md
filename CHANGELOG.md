# Changelog

## 1.0.0 (2026-09-11)


### Features

* 'Adjust with agent' option in the review prompt ([bdddc24](https://github.com/lexoliu/agent-md/commit/bdddc24b141e81c4dac4e31d73c08afc53ccea58))
* add 'Adjust with agent' option to the apply prompt ([9a30b35](https://github.com/lexoliu/agent-md/commit/9a30b35926d3dbaba34c66845943adf007f691fb))
* add devin, agy (Antigravity), and grok drivers ([25561a9](https://github.com/lexoliu/agent-md/commit/25561a9ae6cf943f734cf2e8c69628d5fc60e5ff))
* agent-md installer — merge instruction packages into AGENTS.md/CLAUDE.md via a coding agent with staged diff review ([1ca7e99](https://github.com/lexoliu/agent-md/commit/1ca7e99cec4d3f4f2d4450eba085b2a0b4e58ee3))
* auto-close agent session after DONE; prettier diff review ([60850a5](https://github.com/lexoliu/agent-md/commit/60850a5b2a3f26476daa976fc17a7de3b1c6585b))
* auto-close interactive agent session on DONE; nicer diff display ([ee233e1](https://github.com/lexoliu/agent-md/commit/ee233e1034e6c78c4c727c6a4095a5c5a890006e))
* suspend instead of kill; 'Adjust with agent' resumes the session ([c736fb2](https://github.com/lexoliu/agent-md/commit/c736fb2175dc4d376aabcb636609c356b9d13364))
* suspend/resume the agent session for 'Adjust with agent' ([604bc9e](https://github.com/lexoliu/agent-md/commit/604bc9e8c4fe3a0c98b17cb7f5e7283aca48d522))


### Bug Fixes

* .done sentinel for auto-close; built-in pretty diff renderer ([f2bcb47](https://github.com/lexoliu/agent-md/commit/f2bcb47799f88d577c5ac86a4dbf58517fc3ef59))
* gate interactive agent launch behind a confirm prompt ([17388eb](https://github.com/lexoliu/agent-md/commit/17388eb3c439f56ae5e56601a2e34296bab5d9f6))
* gate publish on release_created, not releases_created ([5eefd95](https://github.com/lexoliu/agent-md/commit/5eefd9539ecadff29cce29aa46872ca7d1337a0d))
* note agent quota + default model usage before launch ([71a0a22](https://github.com/lexoliu/agent-md/commit/71a0a222de2ad8d7f5a196ba31eb7fa36f3c2c85))
* pass --respect-workspace-trust false to devin interactive sessions ([00e3779](https://github.com/lexoliu/agent-md/commit/00e3779ee1fa2818029c84f1f6b8af33dba72b7a))
* pause for confirmation before launching the agent session ([247c832](https://github.com/lexoliu/agent-md/commit/247c832c4f1683127c7dab52bc34ded0789c055d))
* publish only when a GitHub release was actually created ([9301a7f](https://github.com/lexoliu/agent-md/commit/9301a7f7c76c27c47a335f6aad3c95a2037e02ca))
* quiet internal git clone output ([86f0bfa](https://github.com/lexoliu/agent-md/commit/86f0bfa2d74e35be18c7b8395e4f78636ce6e8df))
* restore pty line discipline after closing agent session ([6a510db](https://github.com/lexoliu/agent-md/commit/6a510db54fdc6dcdc730cc7f06ad5cc722af7df9))
* restore terminal after agent session; don't warn on our own close ([8f63c9e](https://github.com/lexoliu/agent-md/commit/8f63c9e83a761a6dcbc8014a3cbe0a4ed065268f))
* restore terminal state after closing interactive agent session ([aec377f](https://github.com/lexoliu/agent-md/commit/aec377fae079b2eef0bf22f6198a2777aa791152))
* signal completion via .done sentinel; built-in pretty diff renderer ([5af3697](https://github.com/lexoliu/agent-md/commit/5af3697155fb63f1f02e63c92fc103ecf412b35a))
* silence git clone progress; surface stderr only on failure ([8a87c92](https://github.com/lexoliu/agent-md/commit/8a87c92f936c939007d3181ac251021e051b52b6))
* skip devin's workspace-trust prompt in interactive mode too ([92c69ec](https://github.com/lexoliu/agent-md/commit/92c69ec9f4c05cff38cfec75ee885f3f79cc942e))
* stty sane after agent session — the staircase garbling was line discipline, not modes ([c9132ca](https://github.com/lexoliu/agent-md/commit/c9132ca581390b0e5afc3cb9f6c6bd9063900e67))
