# pieces 🍑

CLI to verify w3filecoin aggregate offers

```shell
# Create an aria2 download plan for all CARs with checksums
$ pieces plan -i offer.json --output piece-urls.aria

# Fetch and verify all the cars with aria2
$ aria2c -i piece-urls.aria

# Verify the piece cids and aggregate cid
$ pieces verify -i offer.json
```

## Getting Started

With `nodejs` >= v20, install the deps with `npm i`, or use `npx`.

```
# run pieces from github repo! spicy!
$ npx github:web3-storage/pieces plan bafkzcibbatsmklu6hhjkdz4hbatu4uk5bd4uk4zj43xocspxn7yiyo54jy7bg
```

## Usage

The following commands are available

### `plan`

Create an aria2 input file to download all the CARs for the pieces in an aggregate offer json

```shell
$ pieces plan --input aggregate-offer.json --output piece.urls
```

Pass the output to aria2 to fetch all the things, with checksum validation and resumable goodness.

```shell
$ aria2c -i piece.urls
```

#### input

```json
{
  "aggregate": "bafkzcibbd3lmdpootmhl7xhn6dnz7ynhe5a7kaurlnppj7rqd4lembwgdfrdy",
  "collection": "did:key:z6MkqdncRZ1wj8zxCTDUQ8CRT8NQWd63T7mZRvZUX8B7XDFi",
  "orderID": 1695590709485,
  "pieces": [
    "bafkzcibbatsmklu6hhjkdz4hbatu4uk5bd4uk4zj43xocspxn7yiyo54jy7bg",
    "bafkzcibbas7jhdreszithbxqzcxvln2usxtbyeo75pqqsnzz26hybgvlpggcw",
```

#### output

- Sets --checksum flag from car cid from roundabout, to ensure car bytes are correct
- Sets --out to the piece cid, so we can map from input json to file name.

```conf
https://roundabout.web3.storage/bafkzcibbatsmklu6hhjkdz4hbatu4uk5bd4uk4zj43xocspxn7yiyo54jy7bg
  checksum=sha-256=47757f47518259fd3b6575d6cd48e161bcf23ea7cbf16b0638c8c981a0522f63
  out=bafkzcibbatsmklu6hhjkdz4hbatu4uk5bd4uk4zj43xocspxn7yiyo54jy7bg.car
https://roundabout.web3.storage/bafkzcibbas7jhdreszithbxqzcxvln2usxtbyeo75pqqsnzz26hybgvlpggcw
  checksum=sha-256=95673f0ef43a769840aba99e10b41b55601d42eb08e1d7b68b53750f5c6c826d
  out=bafkzcibbas7jhdreszithbxqzcxvln2usxtbyeo75pqqsnzz26hybgvlpggcw.car
```

### `verify`

Check the piece CID for each car. Pass the path to the offer json as `--input`.

Run it from the dir with all the cars that you downloaded with aria from the aria download plan created with `piece plan`

```shell
$ pieces verify --input aggregate-offer.json
aggregate cid bafkzcibbd3lmdpootmhl7xhn6dnz7ynhe5a7kaurlnppj7rqd4lembwgdfrdy ok
verifying 1284 pieces
████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 30% | 5276557/17571857 MiB
```

_takes ~120s to verify 1284 pieces at 18.4GiB_


### `find`

Find the car URL for a piece CID, if the car is stored in w3up and we have a content-claim for it.

```shell
$ pieces find bafkzcibbatsmklu6hhjkdz4hbatu4uk5bd4uk4zj43xocspxn7yiyo54jy7bg
```

#### output

```json
{
  "piece":"bafkzcibbatsmklu6hhjkdz4hbatu4uk5bd4uk4zj43xocspxn7yiyo54jy7bg",
  "car":"bagbaierai52x6r2rqjm72o3foxlm2shbmg6pepvhzpywwbryzdeydicsf5rq",
  "url":"https://carpark-prod-0...",
  "roundabout":"https://roundabout.web3.storage/bafkzcibbatsmklu6hhjkdz4hbatu4uk5bd4uk4zj43xocspxn7yiyo54jy7bg"
}
```