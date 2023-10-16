export function extend() {
	var args = [false, true];
	args.push.apply(args, arguments);
	return _merge.apply(null, args);
}