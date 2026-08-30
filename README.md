# logtotal-sanitizer — Performance Research Fork

This repository is a personal development fork of [SocPrime's `logtotal-sanitizer`](https://github.com/socprime/logtotal-sanitizer).

This is hopefully, a small gift to SOC Prime and Andrii B from Paul G (formerly Diageo). I'm stress testing a novel method of refocussing code (not traditional optimising),
which is machine-assisted, and human orchestrated, and I noticed SOC Prime's post about the sanitiser, so I thought I'd stress-test the code with my method. If you need any more info, AB has my number.

I would greatly appreciate feedback on this, as I'm new to Github, so sorry if I goofed up. I'm interested in the real-world improvements if adopted/tested.

The upstream project provides deterministic sanitization and pseudonymization of sensitive values in log data for Node.js and browser environments.

## Purpose of this fork

This fork is being used to investigate performance and memory improvements while preserving the behaviour and compatibility of the upstream implementation.

The work is based on the existing SocPrime architecture rather than an alternative implementation or competing distribution.

The main goals are:

* identify avoidable work in the sanitization pipeline;
* preserve output and sanitization parity;
* measure changes against repeatable benchmark workloads;
* keep proposed changes small and independently reviewable;
* prepare suitable improvements for possible contribution upstream.

## Current performance work

Two independent candidate changes have completed local review.

### CLI reporting

Avoid collecting detailed replacement and preview information when the normal CLI path only requires aggregate counts.

Explicit detailed/JSON reporting retains the existing behaviour.

Local testing showed meaningful reductions in unnecessary allocation and improved throughput on several match-heavy and JSON workloads.

### Rule-family prerequisite gates

Skip selected built-in rule-family regex work when a cheap prerequisite proves that the family cannot possibly match the current input.

The reviewed gates currently cover:

* IP/MAC/PTR-related rules;
* home-path rules;
* session-cookie rules.

These are semantic prerequisites rather than probabilistic heuristics.

Custom rules remain on the existing unrestricted matching path.

## Validation

Performance candidates are tested against the unmodified upstream implementation.

The local review includes:

* existing project tests;
* output and reporting parity checks;
* adversarial and mixed-input testing;
* deterministic benchmark workloads;
* repeated Node.js/V8 throughput measurements;
* memory and allocation profiling where relevant.

On the reviewed local benchmark portfolio, the two changes together were neutral-to-positive across all tested workloads.

The largest gains occurred when rule families could be eliminated before regex execution.

> **Note:** These results were measured on one local Windows/Node.js system and should not be interpreted as universal performance figures.

## Branches

Development work is kept separate by purpose.

| Branch                           | Purpose                                      |
| -------------------------------- | -------------------------------------------- |
| `wob3/candidate-reporting`       | CLI reporting candidate                      |
| `wob3/candidate-necessary-gates` | Rule prerequisite candidate                  |
| `wob3/topdown-performance-study` | Profiling, benchmarks, and research material |

Experimental combined/rejected branches may also exist for local comparison and are not intended as upstream patches.

## Upstream

The authoritative project is:

**https://github.com/socprime/logtotal-sanitizer**

Please use the upstream repository for:

* official releases;
* package distribution;
* documentation;
* issues;
* support.

This fork is currently a research and contribution workspace.

It is **not intended to replace or redistribute the upstream project**.

## Contribution status

No assumption should be made that experimental changes in this fork are accepted or endorsed by SocPrime.

Candidate changes are kept isolated so they can be reviewed independently and, where appropriate, proposed upstream as focused pull requests.

## License

This fork retains the licensing terms of the upstream `logtotal-sanitizer` project.

See the repository's [`LICENSE`](./LICENSE) file for details.
