const {readFileSync, writeFileSync} = require("node:fs");
const {runInThisContext} = require("node:vm");
const {isGradable, makeWorldVariants} = runInThisContext(
  readFileSync("catalog.js", "utf8") + "\n({isGradable, makeWorldVariants})"
);
const catalog = {};
for (const kind of ["world", "contexts", "people"]) {
  const source = JSON.parse(readFileSync("data/" + kind + ".json", "utf8"));
  const quizzes = kind === "world" ? makeWorldVariants(source) : source;
  quizzes.forEach((quiz, index) => {
    catalog[kind + ":" + index] = {
      title: quiz.title,
      keys: quiz.questions.map(question => isGradable(question) ? question.answer : null),
    };
  });
}
writeFileSync("/tmp/ubttarih-quizzes.json", JSON.stringify(catalog));
