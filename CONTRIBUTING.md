# Contributing

For setup and checks, see [Development](DEVELOPMENT.md).

## Report a Problem

Check existing issues first, then
[report a problem](https://github.com/cmu-web/cmu-web-qrnegie/issues/new?template=bug_report.yml).
Include the image URL or options you used. For a QR code that doesn't scan,
include the phone or scanner app and the size it was printed or shown at.

## Submit a Pull Request

- Branch from `main` and open the pull request against `main`.
- Keep it to one concern. Discuss a larger change, such as a new style, in
  an issue before starting it.
- Explain the problem, the resulting behavior and how you checked the change.
- Run `npm run check` ([Check a Change](DEVELOPMENT.md#check-a-change)) before
  submitting. The Publish Image workflow runs it again on every push and pull
  request.
- Add or update tests when behavior changes.
- Update the options reference, the builder and the MCP guide when changing a
  public image option or style.

## Code and Writing Style

- Edit TypeScript in `src/`; `dist/` is generated and is not committed.
- Browser scripts live in `docs/js/`.
- ESLint and Prettier use the checked-in configuration; see [Linting and
  Formatting](DEVELOPMENT.md#linting-and-formatting).
- One-line code comments are fragments without a period.
- Follow the Web Kilt's [writing
  conventions](https://webkilt.andrew.cmu.edu/0/conventions.html) for
  documentation and examples: AP style, Title Case for headings, buttons and
  labels, and action verbs at the start of buttons and calls to action.
- Use made-up content in examples, and Andrew Carnegie (ac00) for a person.
- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  for commit subjects.

## CMU's Names and Marks

CMU's names, marks and artwork aren't covered by the license. Use them only
as the project already does.
