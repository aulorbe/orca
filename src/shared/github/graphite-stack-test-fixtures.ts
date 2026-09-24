export const stackComment = (
  numbers = [103, 102, 101],
  owner = 'acme',
  repo = 'widgets'
) => `${numbers.map((number) => `* **#${number}** <a href="https://app.graphite.com/github/pr/${owner}/${repo}/${number}?utm_source=stack-comment-icon" target="_blank"><img src="https://static.graphite.dev/graphite-32x32-black.png" alt="Graphite" /></a>`).join('\n')}
* \`main\`
<h2></h2>
This stack of pull requests is managed by <a href="https://graphite.dev?utm-source=stack-comment"><b>Graphite</b></a>.
<!-- Current dependencies on/for this PR: -->`
