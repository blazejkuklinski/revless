import CountUpImport from "react-countup"

// CommonJS interop can expose the component under an additional `default`.
const CountUp = typeof CountUpImport === "object" ? (CountUpImport as unknown as { default: typeof CountUpImport }).default : CountUpImport

export default CountUp
