# Gemini 개발 워크플로우

1. 작업에 관련있는 이름으로 git branch를 생성.
2. 작업에 대한 Plan을 작성하고, 각 Plan에 대해 Task를 계획.
3. 계획된 내용을 docs/tasks 폴더 하위에 branch 명과 동일한 markdown 확장자로 파일 만듦.
4. 계획된 Task를 진행하고 각 Task가 완료될 때, git에 commit.
5. git commit은 @docs/gemini/git.md 파일을 참조하여 커밋메세지 작성.
6. 모든 작업이 완료되면 Pull Request를 `gh` 명령어를 활용해서 생성해줘. Pull Request도 @docs/gemini/git.md 파일을 참조해서 내용 생성해.
7. Pull Request는 현재 브랜치를 base로 설정해서 생성

<Git-branch-naming-rule>
{feature|fix|refactor|chore|build|docs|test|release}/{package-name}/{short-description}
</Git-branch-naming-rule>
