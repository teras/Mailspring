describe('"mailspring" protocol URL', () => {
  it('sends the file relative in the package as response', () => {
    let called = false;
    const request = new XMLHttpRequest();
    request.addEventListener('load', () => {
      called = true;
      return;
    });
    request.open('GET', 'mailspring://account-sidebar/package.json', true);
    request.send();

    waitsFor(() => called === true, 'request to be done');
  });
});
