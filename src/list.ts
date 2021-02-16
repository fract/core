import { Cause } from './cause'
import { Context } from './context'
import { action } from './scheduler'

export class List<T> extends Cause<T[]> {
    private contexts = new Set<Context>()
    private items: T[]

    constructor(items: T[]) {
        super()
        this.items = items
    }

    *whatsUp(context: Context) {
        this.contexts.add(context)

        try {
            while (true) {
                yield this.items
            }
        } finally {
            this.contexts.delete(context)
        }
    }

    get() {
        return this.items
    }

    set(items: T[]) {
        this.items = items

        action(() => {
            for (const context of this.contexts) {
                context.update()
            }
        })
    }

    splice(start: number, deleteCount?: number): this
    splice(start: number, deleteCount: number, ...items: T[]): this
    splice(start: number, ...other: any[]): this {
        const newItems = this.get().slice()
        newItems.splice(start, ...other)
        this.set(newItems)
        return this
    }

    insert(...items: T[]): this {
        const newItems = this.get().slice()
        newItems.push(...items)
        this.set(newItems)
        return this
    }

    insertAt(index: number, ...items: T[]): this {
        return this.splice(index, 0, ...items)
    }

    delete(...items: T[]): this {
        const newItems = this.get().slice()

        for (const item of items) {
            const index = newItems.indexOf(item)
            newItems.splice(index, 1)
        }

        this.set(newItems)

        return this
    }

    deleteAt(index: number, deleteCount = 1): this {
        return this.splice(index, deleteCount)
    }

    sort(compareFn?: (a: T, b: T) => number): this {
        const newItems = this.get().slice()
        newItems.sort(compareFn)
        this.set(newItems)
        return this
    }

    reverse(): this {
        const newItems = this.get().slice()
        newItems.reverse()
        this.set(newItems)
        return this
    }
}

export function list<T>(items: T[] = []) {
    return new List(items)
}
