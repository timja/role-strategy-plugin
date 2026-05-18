1. Anonymous and Authenticated users are special cases, they should be overridden to "Anonymous" and "Authenticated Users"
2. Strobing effect happening on Role management page
3. Hovering over a user or group who has been modified by checkName should show their ID
5. Tippy tooltips are wrong style, this is how pipeline graph view wraps it:

```tsx
export default function Tooltip(props: TippyProps) {
    if (props.content === undefined) {
        return props.children;
    }

    return (
        <Tippy
            theme="tooltip"
            animation="tooltip"
            duration={250}
            touch={false}
            {...props}
        >
            {props.children}
        </Tippy>
    );
}
```

6. Help icon wrong style, see refine-ui branch
7. Ambiguous shows undefined in the tooltip hover, refine-ui displays this nicer with an orange left border
8. Can't migrate ambiguous to a user or group, in refine-ui you use the edit assignment to do this this
9. checkName is called for every assignment, but it should only be called for those on the active page, in the current setup there's 2769 assignments but only 100 on the page