import { cause } from '../src/cause'
import { conse } from '../src/conse'
import { fractal } from '../src/fractal'
import { DeferActor, DeferGenerator } from '../src/defer'
import { Stream } from '../src/stream'
import { watch } from '../src/watcher'

describe('Defer', () => {
    it(`defer current value`, () => {
        const mock = jest.fn()
        let change: DeferActor<any, any>

        const f = cause(function* (ctx) {
            const value = conse('Hello')

            while (true) {
                change = ctx.defer(function* (_, arg) {
                    const newValue = (yield* value) + arg
                    value.set(newValue)
                    return newValue
                })

                yield yield* value
            }
        })

        watch(f, mock)

        expect(mock).lastCalledWith('Hello')

        const result = change!('World')

        expect(result).toBe('HelloWorld')
        expect(mock).lastCalledWith('HelloWorld')

        change!.dispose()

        expect(() => change!('Double')).toThrow()
    })

    it(`should return some actor on sem sem generator`, () => {
        const mock = jest.fn()
        let def: DeferActor<any, any>

        const ups = cause(function* (ctx) {
            const value = conse('Hello')

            const define: DeferGenerator<string, string> = function* (_, arg) {
                const newValue = (yield* value) + arg
                value.set(newValue)
                return newValue
            }

            while (true) {
                def = ctx.defer(define)

                yield yield* value
            }
        })

        watch(ups, mock)

        expect(mock).lastCalledWith('Hello')

        const old = def!

        def!('World')

        expect(mock).lastCalledWith('HelloWorld')
        expect(def!).toBe(old)
    })

    it(`should extract from nested`, () => {
        const mock = jest.fn()
        let def: DeferActor<any, any>

        const ups = cause(function* (ctx) {
            const one = conse('one')
            const two = cause(function* () {
                while (true) {
                    yield '[' + (yield* one) + ']'
                }
            })

            def = ctx.defer(function* (_, arg: string) {
                const newValue = yield* two
                one.set(newValue + arg)
                return newValue
            })

            while (true) {
                yield yield* one
            }
        })

        watch(ups, mock)

        expect(mock).lastCalledWith('one')

        def!('thr')

        expect(mock).lastCalledWith('[one]thr')
    })

    it(`should keep context`, () => {
        const mock = jest.fn()
        let sourceThis: Stream<any>
        let deferThis: Stream<any>
        let def: DeferActor<any, any>

        const ups = cause(function* (this: Stream<any>, ctx) {
            const one = conse('one')

            sourceThis = this

            def = ctx.defer(function* (this: Stream<any>, _, arg) {
                deferThis = this

                const newValue = yield* one
                one.set(newValue + arg)
                return newValue
            })

            const subcause = cause(function* () {
                return yield* one
            })

            while (true) {
                yield yield* subcause
            }
        })

        watch(ups, mock)

        expect(mock).lastCalledWith('one')

        def!('thr')

        expect(mock).lastCalledWith('onethr')
        expect(sourceThis!).toBe(deferThis!)
    })

    it(`should extract delegation`, () => {
        const mock = jest.fn()
        let def: DeferActor<any, any>

        const ups = cause(function* (ctx) {
            const one = conse('one')
            const two = fractal<string>(function* () {
                return one
            } as any)

            def = ctx.defer(function* (_, arg) {
                const newValue = yield* two
                one.set(newValue + arg)
                return newValue
            })

            while (true) {
                yield yield* one
            }
        })

        watch(ups, mock)

        expect(mock).lastCalledWith('one')

        def!('thr')

        expect(mock).lastCalledWith('onethr')
    })

    it(`should throw already breaked`, () => {
        const mock = jest.fn()
        let change: DeferActor<any, any>

        const ups = cause(function* (ctx) {
            const one = conse('one')

            change = ctx.defer(function* (_, arg: string) {
                one.set(arg)
                change.dispose()
            })

            while (true) {
                yield yield* one
            }
        })

        watch(ups, mock)

        expect(mock).lastCalledWith('one')

        change!('two')

        expect(mock).lastCalledWith('two')
        expect(() => change!('thr')).toThrow('Already breaked')
    })

    it(`should break when atom dispose`, () => {
        const mock = jest.fn()
        const disposeMock = jest.fn()
        let change: DeferActor<any, any>

        const ups = cause(function* (ctx) {
            try {
                const one = conse('one')

                change = ctx.defer(function* (_, arg: string) {
                    one.set(arg)
                })

                while (true) {
                    yield yield* one
                }
            } finally {
                disposeMock()
            }
        })

        const dispose = watch(ups, mock)

        expect(mock).lastCalledWith('one')

        change!('two')

        expect(mock).lastCalledWith('two')

        dispose()

        expect(disposeMock).toBeCalled()

        expect(() => change!('thr')).toThrow('Already breaked')
    })

    it(`should throw unknown value`, () => {
        const mock = jest.fn()
        let change: DeferActor<any, any>

        const ups = cause(function* (ctx) {
            const one = conse('one')

            change = ctx.defer(function* (_, arg: string) {
                yield Symbol('WoW') as any
                one.set(arg)
            })

            while (true) {
                yield yield* one
            }
        })

        watch(ups, mock)

        expect(mock).lastCalledWith('one')

        expect(() => change!('two')).toThrow('Unknown value')
    })

    it(`should catch exception`, () => {
        const mock = jest.fn()
        let change: DeferActor<any, any>

        const ups = cause(function* (ctx) {
            const one = conse('one')

            change = ctx.defer(function* () {
                throw 'WoW'
            })

            while (true) {
                yield yield* one
            }
        })

        watch(ups, mock)

        expect(mock).lastCalledWith('one')

        expect(() => change!('two')).toThrow('WoW')
    })

    it(`should catch nested exception`, () => {
        const mock = jest.fn()
        let change: DeferActor<any, any>

        const nested = cause(function* () {
            throw 'WoW'
        })
        const ups = cause(function* (ctx) {
            const one = conse('one')

            change = ctx.defer(function* () {
                return yield* nested
            })

            while (true) {
                yield yield* one
            }
        })

        watch(ups, mock)

        expect(mock).lastCalledWith('one')

        expect(() => change!('two')).toThrow('WoW')
    })
})
