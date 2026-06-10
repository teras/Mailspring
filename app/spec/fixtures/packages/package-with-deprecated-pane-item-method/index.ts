class TestItem {
  getUri() {
    return 'test';
  }
}

exports.activate = () => (AppEnv as any).workspace.addOpener(() => new TestItem());
