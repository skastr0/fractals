import { expect, test } from 'bun:test'

import { parseCommandInput } from '../lib/commands/parse-command'

test('parseCommandInput handles empty input', () => {
  expect(parseCommandInput('')).toEqual({
    isCommand: false,
    name: null,
    args: [],
    raw: '',
  })

  expect(parseCommandInput('   ')).toEqual({
    isCommand: false,
    name: null,
    args: [],
    raw: '   ',
  })
})

test('parseCommandInput ignores non-command text', () => {
  expect(parseCommandInput('hello world')).toEqual({
    isCommand: false,
    name: null,
    args: [],
    raw: 'hello world',
  })
})

test('parseCommandInput parses basic commands', () => {
  expect(parseCommandInput('/help')).toEqual({
    isCommand: true,
    name: 'help',
    args: [],
    raw: '/help',
  })

  expect(parseCommandInput('/help now')).toEqual({
    isCommand: true,
    name: 'help',
    args: ['now'],
    raw: '/help now',
  })
})

test('parseCommandInput supports quoted arguments', () => {
  expect(parseCommandInput('/say "hello world" now')).toEqual({
    isCommand: true,
    name: 'say',
    args: ['hello world', 'now'],
    raw: '/say "hello world" now',
  })
})

test('parseCommandInput supports escaped quotes', () => {
  expect(parseCommandInput('/say "hello \\"world\\""')).toEqual({
    isCommand: true,
    name: 'say',
    args: ['hello "world"'],
    raw: '/say "hello \\"world\\""',
  })
})

test('parseCommandInput handles slash with no name', () => {
  expect(parseCommandInput('/')).toEqual({
    isCommand: true,
    name: '',
    args: [],
    raw: '/',
  })

  expect(parseCommandInput('/   ')).toEqual({
    isCommand: true,
    name: '',
    args: [],
    raw: '/   ',
  })
})
