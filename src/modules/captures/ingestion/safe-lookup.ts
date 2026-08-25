import dns from "node:dns";
import ipaddr from "ipaddr.js";

export function safeLookup(
    hostname: string,
    options: dns.LookupOptions,
    callback: (
        error: NodeJS.ErrnoException | null,
        address: string | dns.LookupAddress[],
        family?: number,
    ) => void
) {
    dns.lookup(
        hostname,
        {
            family: options.family,
            hints: options.hints,
            all: true,
            verbatim: true,
        },
        (error, addresses) => {
            if (error) {
                callback(error, [])
                return
            }

            const safeAddress = addresses.find((entry) => {
                const ip = ipaddr.parse(entry.address)
                const range = ip.range()

                 return (
                    range === "unicast"
                );
            })

            if (!safeAddress) {
                callback(
                    new Error(
                        "Hostname resolves only to restriced addresses"
                    ),
                    [],
                )
                return
            }
            
            if (options.all) {
                callback(null, [safeAddress]);
                return;
            }

            callback(
                null,
                safeAddress.address,
                safeAddress.family,
            )
        }    
    )
}